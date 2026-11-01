// api/admin-partners.ts — CRATE admin side of "Festival in a box".
//
// Owner-level admin credential required (ADMIN_PASSWORD / ADMIN_MASTER_PASSWORD
// or the signed admin session): this is where partners are created, lineups
// are approved and money is settled.
//
// Actions (POST { action, password, ... }):
//   list                         → every partner with draft, review state and checks
//   create      { name, payeeName, contactEmail, crateSharePct, linkPwff? }
//               linkPwff: the PWFF committee's portal (reserved id "pwff"), whose
//               lineup appears on /pwff and is treated as PWFF everywhere
//   update      { partnerId, name?, slug?, payeeName?, contactEmail?, crateSharePct?, status? }
//   invite      { partnerId, email }      → emails a 14-day invitation link (also returned)
//   removeMember{ partnerId, email }
//   requestChanges { partnerId, note }
//   approve     { partnerId, note? }      → publishes the lineup live
//   sales       { partnerId }             → live sales, ticket lines, payout breakdown
//   setPayout   { partnerId, deductions, deductionsNote?, paidAmount?, paidNote?, markPaid? }
//   deleteFestival { partnerId, confirmName } → removes a festival completely (for test
//               festivals). Refuses PWFF and any festival with unrefunded paid tickets.

import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { logServerError } from './_lib/logError.js';
import { HttpError, PARTNERS, PARTNER_INVITES, getPartner, publishPartner, getPartnerSales, planPartnerCleanup, loadScheduledScreenings, partnerOverlaps, deletePartnerFestival } from './_lib/partners.js';
import { loadPartnerFees } from './_lib/partnerFees.js';
import { BOOKKEEPING_COLLECTION, PARTNER_ENTRY_PREFIX, entryFromPartnerPayout } from './_lib/bookkeeping.js';
import { checkDraft, computePayout, slugify, emptyDraft, PartnerRecord, PWFF_PARTNER_ID } from './_lib/partnerRules.js';
import { sendPartnerInvite, notifyPartnerReviewed } from './_lib/partnerEmails.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESERVED_SLUGS = new Set(['pwff', 'admin', 'partner', 'new', 'edit']);

function sharePct(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new HttpError(400, 'CRATE share must be between 0 and 100.');
    return Math.round(n * 100) / 100;
}

async function slugTaken(db: FirebaseFirestore.Firestore, slug: string, exceptId?: string) {
    const snap = await db.collection(PARTNERS).where('slug', '==', slug).get();
    return snap.docs.some(d => d.id !== exceptId);
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body?.password))) return json({ error: 'Unauthorized' }, 401);
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const { action, partnerId } = body;

        const load = async () => {
            const p = await getPartner(db, String(partnerId || ''));
            if (!p) throw new HttpError(404, 'Partner not found.');
            return p;
        };

        switch (action) {
            case 'list': {
                const snap = await db.collection(PARTNERS).orderBy('createdAt', 'desc').get();
                const names = Object.fromEntries(snap.docs.map(d => [d.id, String(d.data().name || d.id)]));
                const scheduled = await loadScheduledScreenings(db, names).catch(e => { console.error('[admin-partners] overlap check failed:', e); return []; });
                const partners = await Promise.all(snap.docs.map(async d => {
                    const p = { ...(d.data() as PartnerRecord), id: d.id };
                    const plan = p.published && !p.cleanup ? await planPartnerCleanup(db, p).catch(() => null) : null;
                    return { ...p, check: checkDraft(p.draft), cleanupPlan: plan, overlaps: partnerOverlaps(p, scheduled) };
                }));
                return json({ partners });
            }

            case 'create': {
                const name = String(body.name || '').trim().slice(0, 120);
                if (!name) throw new HttpError(400, 'Festival / partner name is required.');
                const contactEmail = String(body.contactEmail || '').trim().toLowerCase();
                if (contactEmail && !EMAIL.test(contactEmail)) throw new HttpError(400, 'Contact email looks wrong.');
                let id: string;
                if (body.linkPwff) {
                    id = PWFF_PARTNER_ID;
                    if ((await db.collection(PARTNERS).doc(id).get()).exists) throw new HttpError(409, 'PWFF committee access is already set up.');
                } else {
                    let base = slugify(String(body.slug || name)) || 'festival';
                    if (RESERVED_SLUGS.has(base)) base = `${base}-festival`;
                    id = base;
                    for (let i = 2; (await db.collection(PARTNERS).doc(id).get()).exists || await slugTaken(db, id); i++) id = `${base}-${i}`;
                }
                const record: Omit<PartnerRecord, 'id'> = {
                    name,
                    slug: id,
                    payeeName: String(body.payeeName || name).trim().slice(0, 160),
                    contactEmail,
                    crateSharePct: body.crateSharePct == null || body.crateSharePct === '' ? 30 : sharePct(body.crateSharePct),
                    memberUids: [],
                    memberEmails: [],
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    draft: emptyDraft(name),
                    review: { state: 'draft' },
                };
                await db.collection(PARTNERS).doc(id).set(record);
                return json({ success: true, partner: { ...record, id } });
            }

            case 'update': {
                const p = await load();
                const patch: Record<string, unknown> = {};
                if (body.name != null) patch.name = String(body.name).trim().slice(0, 120) || p.name;
                if (body.payeeName != null) patch.payeeName = String(body.payeeName).trim().slice(0, 160);
                if (body.contactEmail != null) {
                    const e = String(body.contactEmail).trim().toLowerCase();
                    if (e && !EMAIL.test(e)) throw new HttpError(400, 'Contact email looks wrong.');
                    patch.contactEmail = e;
                }
                if (body.crateSharePct != null) patch.crateSharePct = sharePct(body.crateSharePct);
                if (body.status != null) patch.status = body.status === 'archived' ? 'archived' : 'active';
                if (body.slug != null && p.id !== PWFF_PARTNER_ID) {
                    const slug = slugify(String(body.slug));
                    if (!slug || RESERVED_SLUGS.has(slug)) throw new HttpError(400, 'Choose a different web address.');
                    if (await slugTaken(db, slug, p.id)) throw new HttpError(409, 'Another festival already uses that web address.');
                    patch.slug = slug;
                }
                await db.collection(PARTNERS).doc(p.id).set(patch, { merge: true });
                return json({ success: true });
            }

            case 'deleteFestival': {
                const p = await load();
                // Typing the name is the "are you sure": it can't be undone.
                if (String(body.confirmName || '').trim() !== p.name.trim()) {
                    throw new HttpError(400, `Type the festival's name exactly ("${p.name}") to delete it.`);
                }
                const result = await deletePartnerFestival(db, p);
                return json({ success: true, ...result });
            }
            case 'invite': {
                const p = await load();
                const email = String(body.email || '').trim().toLowerCase();
                if (!EMAIL.test(email)) throw new HttpError(400, 'Enter a valid email address.');
                const token = randomBytes(24).toString('hex');
                await db.collection(PARTNER_INVITES).doc(token).set({
                    partnerId: p.id, email, createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                });
                await sendPartnerInvite(email, p.name, token).catch(e => console.error('[admin-partners] invite email failed:', e));
                const site = process.env.VITE_APP_URL || 'https://cratetv.net';
                return json({ success: true, inviteLink: `${site}/partner?invite=${token}` });
            }

            case 'removeMember': {
                const p = await load();
                const email = String(body.email || '').trim().toLowerCase();
                const map: Record<string, string> = (p as any).memberMap || {};
                const uids = Object.entries(map).filter(([, e]) => e === email).map(([uid]) => uid);
                const update: Record<string, unknown> = {
                    memberEmails: (p.memberEmails || []).filter(e => e.toLowerCase() !== email),
                    memberUids: (p.memberUids || []).filter(u => !uids.includes(u)),
                };
                uids.forEach(uid => { update[`memberMap.${uid}`] = FieldValue.delete(); });
                await db.collection(PARTNERS).doc(p.id).update(update);
                return json({ success: true });
            }

            case 'requestChanges': {
                const p = await load();
                const note = String(body.note || '').trim().slice(0, 2000);
                if (!note) throw new HttpError(400, 'Tell the partner what to change.');
                await db.collection(PARTNERS).doc(p.id).set({
                    review: { ...(p.review || {}), state: 'changes_requested', note, reviewedAt: new Date().toISOString() },
                }, { merge: true });
                notifyPartnerReviewed(p.memberEmails || [], p.name, false, note, p.slug).catch(e => console.error('[admin-partners] email failed:', e));
                return json({ success: true });
            }

            case 'approve': {
                const p = await load();
                const note = String(body.note || '').trim().slice(0, 2000);
                const result = await publishPartner(db, p.id, note);
                notifyPartnerReviewed(p.memberEmails || [], p.name, true, note, p.slug).catch(e => console.error('[admin-partners] email failed:', e));
                return json({ success: true, ...result });
            }

            case 'sales': {
                const p = await load();
                const { sales, tickets } = await getPartnerSales(db, p);
                const takeFees = p.payout?.takeSquareFees !== false;
                const fees = p.id === PWFF_PARTNER_ID ? null : await loadPartnerFees(p.id);
                const payout = computePayout(sales.totals.gross, p.payout?.deductions || 0, p.crateSharePct, takeFees && fees ? fees.amount : 0);
                return json({ sales, tickets, payout, squareFees: fees, takeSquareFees: takeFees, payoutStatus: p.payout || null, generatedAt: new Date().toISOString() });
            }

            case 'setPayout': {
                const p = await load();
                const deductions = Number(body.deductions || 0);
                if (!Number.isFinite(deductions) || deductions < 0) throw new HttpError(400, 'Deductions must be 0 or more.');
                const payout: Record<string, unknown> = {
                    ...(p.payout || {}),
                    deductions: Math.round(deductions * 100) / 100,
                    deductionsNote: String(body.deductionsNote || '').slice(0, 500),
                    ...(typeof body.takeSquareFees === 'boolean' ? { takeSquareFees: body.takeSquareFees } : {}),
                };
                if (body.markPaid) {
                    const amount = Number(body.paidAmount);
                    if (!Number.isFinite(amount) || amount < 0) throw new HttpError(400, 'Enter the amount you paid.');
                    payout.paidAt = new Date().toISOString();
                    payout.paidAmount = Math.round(amount * 100) / 100;
                    payout.paidNote = String(body.paidNote || '').slice(0, 500);
                } else if (body.clearPaid) {
                    delete payout.paidAt; delete payout.paidAmount; delete payout.paidNote;
                }
                await db.collection(PARTNERS).doc(p.id).set({ payout }, { merge: true });
                // merge:true can't remove nested keys, so rewrite the map when clearing.
                if (body.clearPaid) await db.collection(PARTNERS).doc(p.id).update({ payout });
                // Bookkeeping: marking paid records the payment; un-marking crosses it out (kept on record).
                try {
                    const entryRef = db.collection(BOOKKEEPING_COLLECTION).doc(`${PARTNER_ENTRY_PREFIX}${p.id}`);
                    if (body.markPaid) {
                        const entry = entryFromPartnerPayout(p.id, p as any, Number(payout.paidAmount), String(payout.paidNote || ''), String(payout.paidAt));
                        if (entry.amountCents > 0) await entryRef.set({ ...entry, createdAt: FieldValue.serverTimestamp() });
                    } else if (body.clearPaid && (await entryRef.get()).exists) {
                        await entryRef.set({ void: true, voidReason: 'Marked as not paid in Partner festivals', voidedAt: FieldValue.serverTimestamp() }, { merge: true });
                    }
                } catch (e) { console.error('[admin-partners] bookkeeping entry failed:', e); }
                return json({ success: true, payout });
            }

            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status);
        console.error('[admin-partners]', error);
        logServerError('api/admin-partners', error);
        return json({ error: (error as Error).message || 'Server error.' }, 500);
    }
}
