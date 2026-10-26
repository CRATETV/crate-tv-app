// api/_lib/partners.ts
//
// Database side of "Festival in a box" (the rules themselves live in
// partnerRules.ts). Partner records are server-only — firestore.rules'
// catch-all denies browser access to `partners` — and every read/write goes
// through api/partner-portal.ts (partner team, signed in) or
// api/admin-partners.ts (CRATE admin).

import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getAdminAuth } from './firebaseAdmin.js';
import { assembleAndSyncMasterData } from '../publish-data.js';
import { blockAccessExpiry } from './watchPartyRules.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../../types.js';
import { partnerPassIsCurrent } from './festivalPass.js';
import {
    PartnerRecord, PartnerDraft, PublicPartnerFestival, TicketLike,
    buildPublishPlan, checkDraft, blocksRemovedWithSales, computeSales, partnerPassItemId, SalesSummary,
    festivalCleanupDueMs, partnerFilmKey, partnerStorageKey, PartnerCleanup,
    PWFF_PARTNER_ID, PWFF_PASS_ITEM_ID, selectPwffDays, blockWindow, findScheduleOverlaps, ScheduleWindow, isSafeId,
} from './partnerRules.js';

export const PARTNERS = 'partners';
export const PARTNER_INVITES = 'partner_invites';

export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

export async function getPartner(db: Firestore, partnerId: string): Promise<PartnerRecord | null> {
    const snap = await db.collection(PARTNERS).doc(partnerId).get();
    return snap.exists ? ({ ...(snap.data() as PartnerRecord), id: snap.id }) : null;
}

/** Verifies a Firebase ID token and returns the partner(s) this user belongs to. */
export async function authenticatePartnerUser(db: Firestore, idToken: unknown): Promise<{ uid: string; email: string; partners: PartnerRecord[] }> {
    const auth = getAdminAuth();
    if (!auth) throw new HttpError(503, 'Service unavailable.');
    if (typeof idToken !== 'string' || !idToken) throw new HttpError(401, 'Please sign in.');
    let decoded;
    try { decoded = await auth.verifyIdToken(idToken); }
    catch { throw new HttpError(401, 'Your session expired — please sign in again.'); }
    const snap = await db.collection(PARTNERS).where('memberUids', 'array-contains', decoded.uid).get();
    const partners = snap.docs
        .map(d => ({ ...(d.data() as PartnerRecord), id: d.id }))
        .filter(p => p.status !== 'archived');
    return { uid: decoded.uid, email: (decoded.email || '').toLowerCase(), partners };
}

export async function requirePartnerMember(db: Firestore, idToken: unknown, partnerId: unknown) {
    const who = await authenticatePartnerUser(db, idToken);
    const partner = who.partners.find(p => p.id === partnerId) || (partnerId ? null : who.partners[0]);
    if (!partner) throw new HttpError(403, "This account isn't on a partner festival team.");
    return { ...who, partner };
}

/** Published festival blocks for a partner, read from the live schedule. */
export async function getPublishedBlocks(db: Firestore, partnerId: string): Promise<any[]> {
    const snap = await db.collection('festival').doc('schedule').collection('days').where('partnerId', '==', partnerId).get();
    return snap.docs.flatMap(d => (d.data().blocks || []) as any[]);
}

const chunk = <T,>(arr: T[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/** All ticket records that belong to this partner (blocks, pass, film rentals). */
export async function getPartnerTickets(db: Firestore, partner: PartnerRecord, blockIds: string[], filmKeys: string[]): Promise<(TicketLike & { id: string; email?: string | null; uid?: string | null; refunded?: boolean })[]> {
    const col = db.collection('festival_tickets');
    const ids = [...new Set([...blockIds, ...filmKeys, partnerPassItemId(partner.id)])];
    const snaps = await Promise.all([
        col.where('partnerId', '==', partner.id).get(),
        ...chunk(ids, 30).map(group => col.where('itemId', 'in', group).get()),
        // PWFF's committee sells the PWFF all-access pass. Count the passes
        // bought since the committee was set up (earlier ones were 2026's).
        ...(partner.id === PWFF_PARTNER_ID ? [col.where('itemId', '==', PWFF_PASS_ITEM_ID).get()] : []),
    ]);
    const byId = new Map<string, any>();
    const passSinceMs = Date.parse(partner.createdAt || '') || 0;
    for (const s of snaps) for (const d of s.docs) {
        const data = d.data();
        if (data.itemId === PWFF_PASS_ITEM_ID) {
            const at = data.purchasedAt?.toDate?.()?.getTime?.() || 0;
            if (at < passSinceMs) continue;
        }
        byId.set(d.id, {
            id: d.id,
            itemId: data.itemId,
            paymentType: data.paymentType,
            amountPaid: data.amountPaid,
            refunded: data.refunded === true,
            partnerId: data.partnerId || null,
            email: data.email || null,
            uid: data.uid || null,
            purchasedAt: data.purchasedAt?.toDate?.()?.toISOString?.() || null,
        });
    }
    return [...byId.values()];
}

export async function getPartnerSales(db: Firestore, partner: PartnerRecord): Promise<{ sales: SalesSummary; tickets: Awaited<ReturnType<typeof getPartnerTickets>> }> {
    const blocks = await getPublishedBlocks(db, partner.id);
    const filmKeys = partner.published?.filmKeys || [];
    const tickets = await getPartnerTickets(db, partner, blocks.map(b => b.id), filmKeys);
    const sales = computeSales(tickets, {
        partnerId: partner.id,
        blocks: blocks.map(b => ({ id: b.id, title: b.title })),
        filmKeys,
    });
    return { sales, tickets };
}

/**
 * Approves and publishes a partner's draft: creates/updates the films,
 * replaces the partner's schedule days, extends festival-pass holders to any
 * new blocks, and republishes the public catalog snapshot.
 */
export async function publishPartner(db: Firestore, partnerId: string, reviewerNote?: string): Promise<{ blocks: number; films: number }> {
    const partner = await getPartner(db, partnerId);
    if (!partner) throw new HttpError(404, 'Partner not found.');
    const draft = partner.draft as PartnerDraft | undefined;
    const check = checkDraft(draft);
    if (!draft || check.errors.length) throw new HttpError(400, `This lineup can't be published yet: ${check.errors.join(' ')}`);

    const plan = buildPublishPlan(partner, draft);
    const daysCol = db.collection('festival').doc('schedule').collection('days');
    const existingDays = await daysCol.where('partnerId', '==', partner.id).get();

    // Never silently drop a block people already bought tickets for.
    const previousBlocks = existingDays.docs.flatMap(d => (d.data().blocks || []) as any[]);
    if (previousBlocks.length) {
        const tickets = await getPartnerTickets(db, partner, previousBlocks.map(b => b.id), []);
        const sold = new Set(tickets.map(t => t.itemId).filter(Boolean) as string[]);
        const removed = blocksRemovedWithSales(previousBlocks.map(b => b.id), plan.blockIds, sold);
        if (removed.length) {
            const titles = previousBlocks.filter(b => removed.includes(b.id)).map(b => `"${b.title}"`).join(', ');
            throw new HttpError(409, `The new lineup removes ${titles}, which already ${removed.length > 1 ? 'have' : 'has'} tickets sold. Put it back, or contact ticket holders before removing it.`);
        }
    }

    // Keep server-maintained fields on blocks that survive the republish.
    const previousById = new Map(previousBlocks.map(b => [b.id, b]));
    for (const day of plan.days) {
        day.data.blocks = (day.data.blocks as any[]).map(b => {
            const prev = previousById.get(b.id);
            if (!prev) return b;
            return {
                ...b,
                ...(prev.ticketsSold != null ? { ticketsSold: prev.ticketsSold } : {}),
                ...(prev.festivalEndTime ? { festivalEndTime: prev.festivalEndTime } : {}),
            };
        });
    }

    const batch = db.batch();
    for (const [key, movie] of Object.entries(plan.movies)) {
        batch.set(db.collection('movies').doc(key), movie, { merge: true });
    }
    const keepDocIds = new Set(plan.days.map(d => d.docId));
    existingDays.docs.forEach(d => { if (!keepDocIds.has(d.id)) batch.delete(d.ref); });
    for (const day of plan.days) batch.set(daysCol.doc(day.docId), day.data);
    const now = new Date().toISOString();
    batch.set(db.collection(PARTNERS).doc(partner.id), {
        published: { details: draft.details, blockIds: plan.blockIds, filmKeys: plan.filmKeys, publishedAt: now },
        review: { state: 'approved', reviewedAt: now, note: reviewerNote || '', submittedAt: partner.review?.submittedAt || null },
    }, { merge: true });
    await batch.commit();

    // Festival-pass holders get every block, including ones added later.
    await extendPassHolders(db, partner, plan.days.flatMap(d => d.data.blocks as any[]));

    try { await assembleAndSyncMasterData(db); }
    catch (e) { console.error('[partners] Catalog republish after partner publish failed:', e); }

    return { blocks: plan.blockIds.length, films: plan.filmKeys.length };
}

export function passExpiryFor(block: any): string {
    return blockAccessExpiry({
        nowMs: Date.now(),
        screeningStartTime: block?.screeningStartTime || block?.watchPartyStartTime,
        rewatchWindowMs: FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS,
    }).toISOString();
}

/** Unlocks the given blocks for one user (used by a pass purchase). */
export async function grantBlocksToUser(db: Firestore, uid: string, partnerId: string, blocks: any[]): Promise<void> {
    const ref = db.collection('users').doc(uid);
    await db.runTransaction(async tx => {
        const data = (await tx.get(ref)).data() || {};
        const current: Record<string, string> = data.unlockedBlocks && typeof data.unlockedBlocks === 'object' && !Array.isArray(data.unlockedBlocks) ? data.unlockedBlocks : {};
        const next = { ...current };
        for (const b of blocks) {
            const exp = passExpiryFor(b);
            if (!next[b.id] || next[b.id] < exp) next[b.id] = exp;
        }
        tx.set(ref, { unlockedBlocks: next, partnerPasses: { ...(data.partnerPasses || {}), [partnerId]: new Date().toISOString() } }, { merge: true });
    });
}

async function extendPassHolders(db: Firestore, partner: PartnerRecord, blocks: any[]): Promise<void> {
    if (!blocks.length || partner.id === PWFF_PARTNER_ID) return; // the PWFF pass already covers every PWFF block
    const passTickets = await db.collection('festival_tickets').where('itemId', '==', partnerPassItemId(partner.id)).get();
    // Only this year's passes: a pass bought before the partner's last
    // festival was cleaned up belonged to that earlier festival.
    const cleanedAtMs = Date.parse(String(partner.cleanup?.deletedAt || '')) || null;
    const current = passTickets.docs.map(d => d.data()).filter(t => {
        if (t.refunded || t.revoked) return false;
        const boughtMs = t.purchasedAt?.toDate ? t.purchasedAt.toDate().getTime() : Date.parse(String(t.purchasedAt || ''));
        return partnerPassIsCurrent(Number.isFinite(boughtMs) ? boughtMs : null, cleanedAtMs);
    });
    const uids = [...new Set(current.map(t => t.uid).filter(Boolean) as string[])];
    for (const uid of uids) {
        try { await grantBlocksToUser(db, uid, partner.id, blocks); }
        catch (e) { console.error(`[partners] Failed to extend pass for ${uid}:`, e); }
    }
}

/** Public slice of every published partner festival, for the catalog snapshot. */
export async function getPublicPartnerFestivals(db: Firestore): Promise<Record<string, PublicPartnerFestival>> {
    const snap = await db.collection(PARTNERS).where('status', '==', 'active').get();
    const out: Record<string, PublicPartnerFestival> = {};
    for (const d of snap.docs) {
        const p = d.data() as PartnerRecord;
        if (!p.published) continue;
        if (d.id === PWFF_PARTNER_ID) continue; // shown on CRATE's own /pwff page
        out[p.slug] = { partnerId: d.id, name: p.name, slug: p.slug, details: p.published.details, blockIds: p.published.blockIds || [] };
    }
    return out;
}

/** What the partner's own team is allowed to see about their record. */
export function partnerView(p: PartnerRecord) {
    return {
        id: p.id, name: p.name, slug: p.slug, payeeName: p.payeeName, crateSharePct: p.crateSharePct,
        memberEmails: p.memberEmails || [], draft: p.draft || null, review: p.review, published: p.published || null,
        payout: p.payout || null,
        isPwff: p.id === PWFF_PARTNER_ID,
    };
}

// ─── After the festival: delete films unless kept ─────────────────────────


export interface CleanupPlan {
    dueAt: string | null;
    deleteFilmKeys: string[];
    keepFilmKeys: string[];
    alreadyDone: boolean;
}

/** Which of a partner's films will be deleted vs kept, and when. */
export async function planPartnerCleanup(db: Firestore, partner: PartnerRecord): Promise<CleanupPlan> {
    const filmKeys = partner.published?.filmKeys || [];
    const blocks = await getPublishedBlocks(db, partner.id);
    const due = festivalCleanupDueMs(blocks, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS);
    // A film is kept if the partner ticked "keep" in their portal (no
    // re-approval needed for that), or its movie record says so.
    const keepFromDraft = new Set(
        (partner.draft?.films || []).filter(f => f.keepAfterFestival).map(f => partnerFilmKey(partner.id, f.id)),
    );
    const keep: string[] = [];
    const del: string[] = [];
    for (const key of filmKeys) {
        const movie = (await db.collection('movies').doc(key).get()).data();
        if (!movie) continue; // already gone
        if (keepFromDraft.has(key) || movie.keepInCatalogAfterFestival === true) keep.push(key);
        else del.push(key);
    }
    return { dueAt: due ? new Date(due).toISOString() : null, deleteFilmKeys: del, keepFilmKeys: keep, alreadyDone: !!partner.cleanup?.deletedAt };
}

/**
 * Deletes a finished partner festival's films (records + uploaded files),
 * except the ones the festival allowed CRATE to keep — those are released
 * into the main catalog. Sales records are never touched.
 */
export async function runPartnerCleanup(db: Firestore, partner: PartnerRecord): Promise<PartnerCleanup> {
    const plan = await planPartnerCleanup(db, partner);
    const bucket = process.env.AWS_S3_BUCKET_NAME || '';
    let region = process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    const s3 = bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })
        : null;
    const failedFiles: string[] = [];

    for (const key of plan.deleteFilmKeys) {
        const ref = db.collection('movies').doc(key);
        const movie = (await ref.get()).data() || {};
        for (const url of [movie.fullMovie, movie.poster, movie.tvPoster]) {
            const objectKey = partnerStorageKey(url, bucket, partner.id);
            if (!objectKey || !s3) continue;
            try { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })); }
            catch (e) { failedFiles.push(objectKey); console.error('[partner-cleanup] S3 delete failed:', objectKey, e); }
        }
        await ref.delete();
        await db.collection('data').doc('movies').update({ [key]: FieldValue.delete() }).catch(() => {});
    }
    for (const key of plan.keepFilmKeys) {
        await db.collection('movies').doc(key).set({ isUnlisted: false, keepInCatalogAfterFestival: true }, { merge: true });
    }

    const cleanup: PartnerCleanup = {
        deletedAt: new Date().toISOString(),
        deletedFilmKeys: plan.deleteFilmKeys,
        keptFilmKeys: plan.keepFilmKeys,
        ...(failedFiles.length ? { failedFiles } : {}),
    };
    await db.collection(PARTNERS).doc(partner.id).set({ cleanup }, { merge: true });
    try { await assembleAndSyncMasterData(db); }
    catch (e) { console.error('[partner-cleanup] Catalog republish failed:', e); }
    return cleanup;
}


// ─── Delete a whole festival (test festivals) ─────────────────────────────

export interface PartnerDeletion {
    deletedFilms: number;
    keptFilms: number;
    deletedBlocks: number;
    deletedFiles: number;
    failedFiles: string[];
}

/** Why a festival can't be deleted, or null if it can. Pure, so it's tested. */
export function deletionBlocker(partner: Pick<PartnerRecord, 'id'>, tickets: { amountPaid?: number; refunded?: boolean }[]): string | null {
    if (partner.id === PWFF_PARTNER_ID) return "PWFF's committee can't be deleted here.";
    const paid = tickets.filter(t => Number(t.amountPaid) > 0 && t.refunded !== true);
    if (paid.length) {
        return `${paid.length} paid ticket${paid.length > 1 ? 's were' : ' was'} sold for this festival. Refund ${paid.length > 1 ? 'them' : 'it'} in Payments & refunds (and tick "mark ticket refunded") before deleting, so nobody loses something they paid for.`;
    }
    return null;
}

/**
 * Removes a festival completely: its schedule, its films (records + uploaded
 * files), its watch parties and chat, invites and the partner itself.
 * Films the festival let CRATE keep in the main catalog stay, files and all.
 * Ticket and sales records are never deleted (they're the money history).
 * Refuses if any paid ticket hasn't been refunded.
 */
export async function deletePartnerFestival(db: Firestore, partner: PartnerRecord): Promise<PartnerDeletion> {
    const daysCol = db.collection('festival').doc('schedule').collection('days');
    const daySnap = await daysCol.where('partnerId', '==', partner.id).get();
    const blocks = daySnap.docs.flatMap(d => (d.data().blocks || []) as any[]);
    const blockIds = blocks.map(b => b.id).filter(Boolean) as string[];

    // Every film this festival ever had: published, draft, and anything in its blocks.
    const filmKeys = new Set<string>([
        ...(partner.published?.filmKeys || []),
        ...(partner.draft?.films || []).map(f => partnerFilmKey(partner.id, f.id)),
        ...blocks.flatMap(b => (b.movieKeys || []) as string[]),
    ]);

    const tickets = await getPartnerTickets(db, partner, blockIds, [...filmKeys]);
    const blocker = deletionBlocker(partner, tickets);
    if (blocker) throw new HttpError(409, blocker);

    const bucket = process.env.AWS_S3_BUCKET_NAME || '';
    let region = process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    const s3 = bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })
        : null;

    // 1. Films. Kept-in-catalog films stay, and so do their files.
    const keepFiles = new Set<string>();
    let deletedFilms = 0, keptFilms = 0;
    for (const key of filmKeys) {
        const ref = db.collection('movies').doc(key);
        const movie = (await ref.get()).data();
        if (!movie) continue;
        if (movie.keepInCatalogAfterFestival === true && partner.cleanup?.deletedAt) {
            keptFilms++;
            for (const url of [movie.fullMovie, movie.poster, movie.tvPoster, movie.trailer]) {
                const k = partnerStorageKey(url, bucket, partner.id);
                if (k) keepFiles.add(k);
            }
            continue;
        }
        await ref.delete();
        await db.collection('data').doc('movies').update({ [key]: FieldValue.delete() }).catch(() => {});
        deletedFilms++;
    }

    // 2. Uploaded files: everything in this festival's own folder, except kept films' files.
    let deletedFiles = 0;
    const failedFiles: string[] = [];
    if (s3 && isSafeId(partner.id)) {
        let token: string | undefined;
        do {
            const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `partners/${partner.id}/`, ContinuationToken: token }));
            for (const obj of page.Contents || []) {
                if (!obj.Key || keepFiles.has(obj.Key)) continue;
                try { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key })); deletedFiles++; }
                catch (e) { failedFiles.push(obj.Key); console.error('[partner-delete] S3 delete failed:', obj.Key, e); }
            }
            token = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (token);
    }

    // 3. Schedule, watch parties (with their chat), invites, and the partner.
    for (const d of daySnap.docs) await d.ref.delete();
    for (const id of blockIds) {
        await db.recursiveDelete(db.collection('watch_parties').doc(id)).catch(e => console.error('[partner-delete] watch party cleanup failed:', id, e));
    }
    const invites = await db.collection(PARTNER_INVITES).where('partnerId', '==', partner.id).get();
    for (const d of invites.docs) await d.ref.delete();
    await db.collection(PARTNERS).doc(partner.id).delete();

    try { await assembleAndSyncMasterData(db); }
    catch (e) { console.error('[partner-delete] Catalog republish failed:', e); }

    return { deletedFilms, keptFilms, deletedBlocks: blockIds.length, deletedFiles, failedFiles };
}


// ─── Schedule overlaps (admin warning only) ───────────────────────────────

/** A festival screening already on the calendar, tagged with who owns it. */
export interface ScheduledScreening { owner: string; window: ScheduleWindow }

/**
 * Every festival screening currently on the site: PWFF (as shown on /pwff),
 * Crate Fest and each partner festival. Runtimes come from the films.
 */
export async function loadScheduledScreenings(db: Firestore, partnerNames: Record<string, string>): Promise<ScheduledScreening[]> {
    const [daysSnap, settingsSnap] = await Promise.all([
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
    ]);
    const allDays = daysSnap.docs.map(d => d.data() as { partnerId?: string; blocks?: any[] });
    const pwffDays = new Set(selectPwffDays(allDays));
    const entries: { owner: string; festival: string; block: any }[] = [];
    for (const day of allDays) {
        const isPwff = pwffDays.has(day);
        if (day.partnerId && day.partnerId !== PWFF_PARTNER_ID && !isPwff) {
            for (const b of day.blocks || []) entries.push({ owner: day.partnerId, festival: partnerNames[day.partnerId] || day.partnerId, block: b });
        } else if (isPwff) {
            for (const b of day.blocks || []) entries.push({ owner: PWFF_PARTNER_ID, festival: 'PWFF', block: b });
        }
    }
    const crateFest = settingsSnap.data()?.crateFestConfig;
    for (const b of crateFest?.movieBlocks || []) entries.push({ owner: 'cratefest', festival: crateFest?.title || 'Crate Fest', block: b });

    const keys = [...new Set(entries.flatMap(e => (Array.isArray(e.block?.movieKeys) ? e.block.movieKeys : []) as string[]))];
    const minutes = new Map<string, number>();
    const snaps = await Promise.all(keys.map(k => db.collection('movies').doc(k).get()));
    snaps.forEach((snap, i) => minutes.set(keys[i], Number(snap.data()?.durationInMinutes) || 0));

    const out: ScheduledScreening[] = [];
    for (const e of entries) {
        const w = blockWindow(e.festival, e.block?.title || 'Untitled block', e.block?.screeningStartTime || e.block?.watchPartyStartTime,
            ((e.block?.movieKeys || []) as string[]).map(k => minutes.get(k) || 0), e.block?.festivalEndTime);
        if (w) out.push({ owner: e.owner, window: w });
    }
    return out;
}

/** Where this partner's draft lineup overlaps another festival's screenings. */
export function partnerOverlaps(partner: PartnerRecord, scheduled: ScheduledScreening[]) {
    const draft = partner.draft;
    if (!draft) return [];
    const runtime = new Map(draft.films.map(f => [f.id, Number(f.durationInMinutes) || 0]));
    const mine = draft.days.flatMap(d => d.blocks.map(b =>
        blockWindow(partner.name, b.title || 'Untitled block', b.screeningStartTime, b.filmIds.map(id => runtime.get(id) || 0))))
        .filter((w): w is ScheduleWindow => !!w);
    const others = scheduled.filter(s => s.owner !== partner.id).map(s => s.window);
    return findScheduleOverlaps(mine, others).map(o => ({
        title: o.mine.title, startsAt: new Date(o.mine.startMs).toISOString(),
        otherFestival: o.other.festival, otherTitle: o.other.title,
        otherStartsAt: new Date(o.other.startMs).toISOString(), otherEndsAt: new Date(o.other.endMs).toISOString(),
    }));
}
