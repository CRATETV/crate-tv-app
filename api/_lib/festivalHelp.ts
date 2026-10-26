// api/_lib/festivalHelp.ts — database side of the festival help button
// (api/festival-help.ts). Rules live in festivalHelpRules.ts.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../../types.js';
import { grantBlocksToUser, getPublishedBlocks, getPartner, PARTNERS } from './partners.js';
import { selectPwffDays, partnerIdFromPassItem, PWFF_PASS_ITEM_ID } from './partnerRules.js';
import { computeFestivalPassExpiry } from './festivalTiming.js';
import { laterExpiry } from './festivalPass.js';
import { HelpTicket, HelpBlockInfo, TicketDiagnosis, diagnoseTicket, ownedTickets, pwffWindowOf } from './festivalHelpRules.js';

// ─── Gathering the viewer's tickets ───────────────────────────────────────

export async function loadTickets(db: Firestore, uid: string, email: string): Promise<HelpTicket[]> {
    const col = db.collection('festival_tickets');
    const queries = [col.where('uid', '==', uid).get()];
    if (email) queries.push(col.where('email', '==', email).get());
    const byId = new Map<string, HelpTicket>();
    for (const snap of await Promise.all(queries)) for (const d of snap.docs) {
        const x = d.data();
        byId.set(d.id, {
            id: d.id, itemId: x.itemId, paymentType: x.paymentType, uid: x.uid || null, email: x.email || null,
            purchasedAtMs: x.purchasedAt?.toDate?.()?.getTime?.() || null,
            refunded: !!x.refunded, revoked: !!x.revoked, status: x.status || null,
        });
    }
    return [...byId.values()];
}

export interface Catalog { blocks: Map<string, HelpBlockInfo & { link: string }>; labels: Map<string, string>; links: Map<string, string>; pwff: ReturnType<typeof pwffWindowOf>; partnerCleanedAt: Map<string, number> }

export async function loadCatalog(db: Firestore, tickets: HelpTicket[]): Promise<Catalog> {
    const [daysSnap, settingsSnap, partnersSnap] = await Promise.all([
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
        db.collection(PARTNERS).get().catch(() => null),
    ]);
    const partnerSlug = new Map<string, { name: string; slug: string }>();
    partnersSnap?.docs.forEach(d => partnerSlug.set(d.id, { name: String(d.data().name || d.id), slug: String(d.data().slug || d.id) }));
    // When each partner's previous festival was cleaned up: passes bought before that were for last year.
    const partnerCleanedAt = new Map<string, number>();
    partnersSnap?.docs.forEach(d => {
        const raw = d.data().cleanup?.deletedAt;
        const ms = raw?.toDate ? raw.toDate().getTime() : Date.parse(String(raw || ''));
        if (Number.isFinite(ms) && ms > 0) partnerCleanedAt.set(d.id, ms);
    });

    const blocks = new Map<string, HelpBlockInfo & { link: string }>();
    const days = daysSnap.docs.map(d => d.data() as { partnerId?: string; blocks?: any[] });
    for (const day of days) for (const b of day.blocks || []) {
        if (b?.id) blocks.set(b.id, { id: b.id, title: b.title || 'Festival block', screeningStartTime: b.screeningStartTime || b.watchPartyStartTime || null, link: `/watchparty/${b.id}` });
    }
    for (const b of settingsSnap.data()?.crateFestConfig?.movieBlocks || []) {
        if (b?.id) blocks.set(b.id, { id: b.id, title: b.title || 'Crate Fest block', screeningStartTime: b.screeningStartTime || b.watchPartyStartTime || null, link: `/watchparty/${b.id}` });
    }
    const pwff = pwffWindowOf(selectPwffDays(days).flatMap(d => d.blocks || []));

    const labels = new Map<string, string>();
    const links = new Map<string, string>();
    labels.set(PWFF_PASS_ITEM_ID, 'PWFF all-access pass'); links.set(PWFF_PASS_ITEM_ID, '/pwff');
    const movieKeys = new Set<string>();
    for (const t of tickets) {
        const id = String(t.itemId || '');
        const pid = partnerIdFromPassItem(id);
        if (pid) {
            const p = partnerSlug.get(pid);
            labels.set(id, `${p?.name || 'Festival'} — festival pass`);
            links.set(id, `/festivals/${p?.slug || pid}`);
        } else if (!blocks.has(id) && id && id !== PWFF_PASS_ITEM_ID) movieKeys.add(id);
    }
    const keys = [...movieKeys].slice(0, 50);
    const snaps = await Promise.all(keys.map(k => db.collection('movies').doc(k).get()));
    snaps.forEach((s, i) => {
        const title = s.data()?.title;
        if (title) labels.set(keys[i], title);
        links.set(keys[i], `/movie/${keys[i]}`);
    });
    return { blocks, labels, links, pwff, partnerCleanedAt };
}

export async function diagnose(db: Firestore, uid: string, email: string) {
    const all = await loadTickets(db, uid, email);
    const mine = ownedTickets(all, uid, email);
    const [userSnap, catalog] = await Promise.all([db.collection('users').doc(uid).get(), loadCatalog(db, mine)]);
    const user = userSnap.data() || {};
    const results = mine.map(t => diagnoseTicket(t, user, {
        nowMs: Date.now(), rewatchWindowMs: FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS, blocks: catalog.blocks, pwff: catalog.pwff, labels: catalog.labels, partnerCleanedAt: catalog.partnerCleanedAt,
    }));
    return { mine, results, catalog };
}

/** Applies the restorations the rules allowed. Returns ticket ids that were fixed. */
export async function applyRepairs(db: Firestore, uid: string, mine: HelpTicket[], results: TicketDiagnosis[]): Promise<Set<string>> {
    const fixed = new Set<string>();
    const userRef = db.collection('users').doc(uid);
    // Attach tickets bought with this email but never linked to an account.
    for (const t of mine) if (!t.uid) await db.collection('festival_tickets').doc(t.id).set({ uid, linkedByHelpAt: new Date().toISOString() }, { merge: true });

    const blockGrants: Record<string, string> = {};
    let allAccess = false;
    const partyKeys: string[] = [];
    const partnerPasses = new Set<string>();
    for (const r of results) {
        const a = r.action;
        if (a.kind === 'grant-block') { blockGrants[a.blockId] = a.expiresAt; fixed.add(r.ticketId); }
        if (a.kind === 'grant-all-access') { allAccess = true; fixed.add(r.ticketId); }
        if (a.kind === 'grant-watch-party') { partyKeys.push(a.movieKey); fixed.add(r.ticketId); }
        if (a.kind === 'grant-partner-pass') { partnerPasses.add(a.partnerId); fixed.add(r.ticketId); }
    }
    if (Object.keys(blockGrants).length || allAccess || partyKeys.length) {
        const passExpiry = allAccess ? await computeFestivalPassExpiry(db) : '';
        await db.runTransaction(async tx => {
            const data = (await tx.get(userRef)).data() || {};
            const patch: Record<string, unknown> = {};
            if (Object.keys(blockGrants).length) {
                const cur = data.unlockedBlocks && typeof data.unlockedBlocks === 'object' && !Array.isArray(data.unlockedBlocks) ? data.unlockedBlocks : {};
                const next = { ...cur };
                for (const [id, exp] of Object.entries(blockGrants)) if (!next[id] || next[id] < exp) next[id] = exp;
                patch.unlockedBlocks = next;
            }
            if (allAccess && passExpiry) {
                patch.hasFestivalAllAccess = true;
                patch.festivalAllAccessGrantedAt = new Date().toISOString();
                patch.festivalPassExpiry = laterExpiry(data.festivalPassExpiry, passExpiry);
            }
            if (partyKeys.length) patch.unlockedWatchPartyKeys = [...new Set([...(data.unlockedWatchPartyKeys || []), ...partyKeys])];
            tx.set(userRef, patch, { merge: true });
        });
    }
    for (const pid of partnerPasses) {
        const partner = await getPartner(db, pid);
        if (partner) await grantBlocksToUser(db, uid, pid, await getPublishedBlocks(db, pid));
    }
    if (fixed.size) {
        await db.collection('help_repairs').add({ uid, ticketIds: [...fixed], at: FieldValue.serverTimestamp() });
    }
    return fixed;
}

