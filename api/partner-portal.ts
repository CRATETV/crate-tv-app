// api/partner-portal.ts — the partner festival team's endpoint ("Festival in a box").
//
// Every action requires a signed-in CRATE account (Firebase ID token) that is
// a member of the partner. Partners can only ever see and change their own
// draft, uploads and sales — never other partners, CRATE's catalog, or
// customer emails.
//
// Actions (POST { action, idToken, partnerId?, ... }):
//   me            → partner(s) this account manages, with draft + review state
//   acceptInvite  → { token } joins the partner the invitation is for
//   saveDraft     → { draft } saves work in progress (never goes live by itself)
//   submit        → sends the draft to CRATE for review
//   uploadUrl     → { kind, fileName, fileType, size } presigned upload for a poster/film/logo
//   sales         → live ticket sales + payout estimate
//   zineList / zineSave / zineSubmit / zineDelete → the partner's pieces for The Unpack (the zine)

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { logServerError } from './_lib/logError.js';
import {
    HttpError, PARTNERS, PARTNER_INVITES, authenticatePartnerUser, requirePartnerMember, getPartnerSales, partnerView,
    planPartnerCleanup,
} from './_lib/partners.js';
import { checkDraft, sanitizeDraft, computePayout, PWFF_PARTNER_ID } from './_lib/partnerRules.js';
import { notifyOwnerSubmitted, notifyOwnerPieceSubmitted } from './_lib/partnerEmails.js';
import { sanitizePartnerPiece } from './_lib/zineRules.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const UPLOAD_KINDS: Record<string, { folder: string; types: RegExp; maxBytes: number }> = {
    poster: { folder: 'posters', types: /^image\/(jpeg|png|webp)$/, maxBytes: 15 * 1024 * 1024 },
    logo: { folder: 'branding', types: /^image\/(jpeg|png|webp|svg\+xml)$/, maxBytes: 5 * 1024 * 1024 },
    hero: { folder: 'branding', types: /^image\/(jpeg|png|webp)$/, maxBytes: 15 * 1024 * 1024 },
    // A single presigned PUT is limited to 5 GB by S3.
    story: { folder: 'zine', types: /^image\/(jpeg|png|webp)$/, maxBytes: 15 * 1024 * 1024 },
    video: { folder: 'films', types: /^video\/(mp4|quicktime|x-m4v)$/, maxBytes: 5 * 1024 * 1024 * 1024 },
};

export async function POST(request: Request) {
    try {
        if (!rateLimit(`partner-portal:${getIP(request)}`, 120, 60_000)) return json({ error: 'Too many requests — try again in a minute.' }, 429);
        const body = await request.json().catch(() => ({}));
        const { action, idToken, partnerId } = body || {};
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);

        switch (action) {
            case 'me': {
                const who = await authenticatePartnerUser(db, idToken);
                const partners = await Promise.all(who.partners.map(async p => {
                    const plan = p.published ? await planPartnerCleanup(db, p).catch(() => null) : null;
                    return { ...partnerView(p), check: checkDraft(p.draft), cleanupDueAt: plan?.dueAt || null, cleanup: p.cleanup || null };
                }));
                return json({ email: who.email, partners });
            }

            case 'acceptInvite': {
                const who = await authenticatePartnerUser(db, idToken);
                const token = typeof body.token === 'string' ? body.token.trim() : '';
                if (!/^[a-f0-9]{32,64}$/.test(token)) throw new HttpError(400, 'That invitation link is not valid.');
                const inviteRef = db.collection(PARTNER_INVITES).doc(token);
                const result = await db.runTransaction(async tx => {
                    const invite = (await tx.get(inviteRef)).data();
                    if (!invite) throw new HttpError(404, 'That invitation link is not valid.');
                    if (invite.usedAt) throw new HttpError(410, 'This invitation was already used. Ask Crate TV for a new one if you need it.');
                    if (Date.parse(invite.expiresAt) < Date.now()) throw new HttpError(410, 'This invitation has expired. Ask Crate TV to send a new one.');
                    if ((invite.email || '').toLowerCase() !== who.email) {
                        throw new HttpError(403, `This invitation is for ${invite.email}. Sign in with that email address, then open the link again.`);
                    }
                    const partnerRef = db.collection(PARTNERS).doc(invite.partnerId);
                    const partner = (await tx.get(partnerRef)).data();
                    if (!partner) throw new HttpError(404, 'This festival no longer exists.');
                    const uids = new Set<string>(partner.memberUids || []);
                    const emails = new Set<string>((partner.memberEmails || []).map((e: string) => e.toLowerCase()));
                    uids.add(who.uid);
                    emails.add(who.email);
                    tx.update(partnerRef, {
                        memberUids: [...uids],
                        memberEmails: [...emails],
                        [`memberMap.${who.uid}`]: who.email,
                    });
                    tx.update(inviteRef, { usedAt: new Date().toISOString(), usedByUid: who.uid });
                    return { partnerId: invite.partnerId, name: partner.name };
                });
                return json({ success: true, ...result });
            }

            case 'saveDraft': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                const raw = JSON.stringify(body.draft || {});
                if (raw.length > 600_000) throw new HttpError(413, 'This draft is too large to save.');
                const draft = sanitizeDraft(body.draft);
                // PWFF sells the PWFF all-access pass, priced by CRATE in the admin.
                if (partner.id === PWFF_PARTNER_ID) draft.details.passPrice = 0;
                // Editing after submitting takes the lineup back to "draft" —
                // it has to be resubmitted, so CRATE always reviews what goes live.
                const review = partner.review?.state === 'submitted' || partner.review?.state === 'approved'
                    ? { ...partner.review, state: 'draft' as const }
                    : (partner.review || { state: 'draft' as const });
                await db.collection(PARTNERS).doc(partner.id).set({ draft, review }, { merge: true });
                return json({ success: true, draft, review, check: checkDraft(draft) });
            }

            case 'submit': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                const check = checkDraft(partner.draft);
                if (check.errors.length) throw new HttpError(400, `Please fix these first: ${check.errors.join(' ')}`);
                const review = { state: 'submitted' as const, submittedAt: new Date().toISOString(), note: '' };
                await db.collection(PARTNERS).doc(partner.id).set({ review }, { merge: true });
                const blocks = (partner.draft?.days || []).reduce((n, d) => n + (d.blocks?.length || 0), 0);
                notifyOwnerSubmitted(partner.name, partner.draft?.films.length || 0, blocks).catch(e => console.error('[partner-portal] notify failed:', e));
                return json({ success: true, review });
            }

            case 'uploadUrl': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                if (!rateLimit(`partner-upload:${partner.id}`, 60, 60 * 60_000)) throw new HttpError(429, 'Upload limit reached for this hour.');
                const kind = UPLOAD_KINDS[body.kind];
                if (!kind) throw new HttpError(400, 'Unknown upload type.');
                const fileType = String(body.fileType || '');
                const size = Number(body.size || 0);
                if (!kind.types.test(fileType)) throw new HttpError(400, body.kind === 'video' ? 'Films must be MP4 or MOV files.' : 'Images must be JPG, PNG or WebP.');
                if (!(size > 0) || size > kind.maxBytes) {
                    throw new HttpError(400, body.kind === 'video' ? 'Films must be under 5 GB. Export a smaller file (H.264, 1080p) and try again.' : 'That image is too large.');
                }
                const bucket = process.env.AWS_S3_BUCKET_NAME;
                let region = process.env.AWS_S3_REGION || 'us-east-1';
                if (region === 'global') region = 'us-east-1';
                const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
                const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
                if (!bucket || !accessKeyId || !secretAccessKey) throw new HttpError(503, 'Uploads are not configured.');
                const safeName = String(body.fileName || 'file').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'file';
                const key = `partners/${partner.id}/${kind.folder}/${Date.now()}-${safeName}`;
                const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
                const signedUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType }), { expiresIn: 3600 });
                return json({ signedUrl, publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}` });
            }

            case 'zineList': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                const snap = await db.collection('zine_submissions').where('partnerId', '==', partner.id).get();
                const pieces = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a: any, b: any) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
                return json({ pieces });
            }

            case 'zineSave': {
                const { partner, email } = await requirePartnerMember(db, idToken, partnerId);
                if (!rateLimit(`partner-zine:${partner.id}`, 120, 60 * 60_000)) throw new HttpError(429, 'Too many saves. Try again in a bit.');
                const { piece } = sanitizePartnerPiece(body.piece);
                const col = db.collection('zine_submissions');
                const now = new Date().toISOString();
                const pieceId = typeof body.pieceId === 'string' && body.pieceId ? body.pieceId : '';
                if (pieceId) {
                    const ref = col.doc(pieceId);
                    const cur = (await ref.get()).data();
                    if (!cur || cur.partnerId !== partner.id) throw new HttpError(404, 'That piece was not found.');
                    if (cur.status === 'submitted' || cur.status === 'accepted') throw new HttpError(409, cur.status === 'accepted' ? 'This piece was accepted and is being edited by Crate TV.' : 'This piece is waiting for review. Ask Crate TV to send it back if you need to change it.');
                    await ref.set({ piece, updatedAt: now, status: cur.status === 'changes' ? 'changes' : 'draft' }, { merge: true });
                    return json({ success: true, id: pieceId });
                }
                const ref = await col.add({ partnerId: partner.id, partnerName: partner.name, piece, status: 'draft', createdAt: now, updatedAt: now, createdBy: email || '' });
                return json({ success: true, id: ref.id });
            }

            case 'zineSubmit': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                const ref = db.collection('zine_submissions').doc(String(body.pieceId || ''));
                const cur = (await ref.get()).data();
                if (!cur || cur.partnerId !== partner.id) throw new HttpError(404, 'That piece was not found.');
                if (cur.status === 'submitted' || cur.status === 'accepted') throw new HttpError(409, 'This piece was already sent.');
                const { piece, errors } = sanitizePartnerPiece(cur.piece);
                if (errors.length) throw new HttpError(400, `Please fix these first: ${errors.join(' ')}`);
                await ref.set({ status: 'submitted', submittedAt: new Date().toISOString(), note: '' }, { merge: true });
                notifyOwnerPieceSubmitted(partner.name, piece.title).catch(e => console.error('[partner-portal] zine notify failed:', e));
                return json({ success: true });
            }

            case 'zineDelete': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                const ref = db.collection('zine_submissions').doc(String(body.pieceId || ''));
                const cur = (await ref.get()).data();
                if (!cur || cur.partnerId !== partner.id) throw new HttpError(404, 'That piece was not found.');
                if (cur.status === 'accepted') throw new HttpError(409, 'This piece was accepted, so it can not be deleted here.');
                await ref.delete();
                return json({ success: true });
            }

            case 'sales': {
                const { partner } = await requirePartnerMember(db, idToken, partnerId);
                const { sales } = await getPartnerSales(db, partner);
                const payout = computePayout(sales.totals.gross, partner.payout?.deductions || 0, partner.crateSharePct);
                return json({ sales, payout, payoutStatus: partner.payout || null, generatedAt: new Date().toISOString() });
            }

            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status);
        console.error('[partner-portal]', error);
        logServerError('api/partner-portal', error);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
