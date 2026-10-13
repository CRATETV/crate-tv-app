// api/_lib/backstage.ts
//
// The backstage key lets a director/host join a live party as a verified
// guest (Q&A, polls, "Director" chat badge, and now a signed stream link).
//
// SECURITY (Oct 2026 audit): the key used to live on the public
// watch_parties/{id} document, which every browser can read — so anyone
// could pull it out of the page and act as the director. It now lives in
// watch_party_secrets/{id}, which only the server can read (firestore.rules'
// catch-all deny). The legacy public field is still read as a fallback so
// a party that was already live during the upgrade keeps working.

import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { timingSafeEqual, createHash } from 'crypto';

const SECRETS = 'watch_party_secrets';

export async function getBackstageKey(db: Firestore, partyId: string): Promise<string | null> {
    const secret = (await db.collection(SECRETS).doc(partyId).get()).data()?.backstageKey;
    if (typeof secret === 'string' && secret) return secret;
    const legacy = (await db.collection('watch_parties').doc(partyId).get()).data()?.backstageKey;
    return typeof legacy === 'string' && legacy ? legacy : null;
}

/** Writes (or clears, with null) the key. Pass `tx` to join a transaction. */
export function setBackstageKey(db: Firestore, partyId: string, key: string | null, tx?: Transaction): Promise<unknown> | void {
    const ref = db.collection(SECRETS).doc(partyId);
    const data = { backstageKey: key, updatedAt: new Date().toISOString() };
    if (tx) { tx.set(ref, data, { merge: true }); return; }
    return ref.set(data, { merge: true });
}

const digest = (v: string) => createHash('sha256').update(v.trim().toUpperCase()).digest();

/** Constant-time, case-insensitive check of a candidate key. */
export async function checkBackstageKey(db: Firestore, partyId: string, candidate: unknown): Promise<boolean> {
    if (typeof candidate !== 'string' || !candidate.trim()) return false;
    const real = await getBackstageKey(db, partyId);
    if (!real) return false;
    return timingSafeEqual(digest(real), digest(candidate));
}
