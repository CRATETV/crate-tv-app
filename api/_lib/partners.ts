// api/_lib/partners.ts
//
// Database side of "Festival in a box" (the rules themselves live in
// partnerRules.ts). Partner records are server-only — firestore.rules'
// catch-all denies browser access to `partners` — and every read/write goes
// through api/partner-portal.ts (partner team, signed in) or
// api/admin-partners.ts (CRATE admin).

import type { Firestore } from 'firebase-admin/firestore';
import { getAdminAuth } from './firebaseAdmin.js';
import { assembleAndSyncMasterData } from '../publish-data.js';
import { blockAccessExpiry } from './watchPartyRules.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../../types.js';
import {
    PartnerRecord, PartnerDraft, PublicPartnerFestival, TicketLike,
    buildPublishPlan, checkDraft, blocksRemovedWithSales, computeSales, partnerPassItemId, SalesSummary,
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
export async function getPartnerTickets(db: Firestore, partner: PartnerRecord, blockIds: string[], filmKeys: string[]): Promise<(TicketLike & { id: string; email?: string | null; uid?: string | null })[]> {
    const col = db.collection('festival_tickets');
    const ids = [...new Set([...blockIds, ...filmKeys, partnerPassItemId(partner.id)])];
    const snaps = await Promise.all([
        col.where('partnerId', '==', partner.id).get(),
        ...chunk(ids, 30).map(group => col.where('itemId', 'in', group).get()),
    ]);
    const byId = new Map<string, any>();
    for (const s of snaps) for (const d of s.docs) {
        const data = d.data();
        byId.set(d.id, {
            id: d.id,
            itemId: data.itemId,
            paymentType: data.paymentType,
            amountPaid: data.amountPaid,
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
    if (!blocks.length) return;
    const passTickets = await db.collection('festival_tickets').where('itemId', '==', partnerPassItemId(partner.id)).get();
    const uids = [...new Set(passTickets.docs.map(d => d.data().uid).filter(Boolean) as string[])];
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
    };
}
