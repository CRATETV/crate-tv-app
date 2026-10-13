import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { blockAccessExpiry } from './_lib/watchPartyLifecycle.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types.js';

// Redeems a festival ticket code (full festival pass, single-day pass, or a
// specific block) and grants the corresponding access.
//
// This used to be done ENTIRELY client-side in ClaimPage.tsx: the browser
// would read the code, check its own copy of `isRedeemed`, write the access
// fields (hasFestivalAllAccess / unlockedFestivalDays / unlockedBlocks /
// unlockedWatchPartyKeys) straight to the user's own Firestore doc, and then
// mark the code redeemed — all with no server involved. Two real problems:
//   1. Those access fields are exactly what firestore.rules now protects
//      (see the note there), so that flow would simply stop working.
//   2. Even before that, a user could skip the "read the code" step
//      entirely and just call the grant functions directly with any code
//      data they wanted, or two people could redeem the same one-time code
//      in the same instant (read-then-write race, not atomic).
// This endpoint does the whole thing — validate, grant, mark-redeemed — in
// one Firestore transaction under the Admin SDK, so it's atomic and the
// grant only happens after the code is actually verified server-side.
export async function POST(request: Request) {
    try {
        const { code, idToken } = await request.json();

        if (!code || !idToken) {
            return new Response(JSON.stringify({ error: 'Code and session are required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);

        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('Database unavailable.');

        let uid: string;
        try {
            uid = (await auth.verifyIdToken(idToken)).uid;
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid session — please sign in again.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const normalizedCode = String(code).toUpperCase().trim();
        const codesSnap = await db.collection('ticket_codes').where('code', '==', normalizedCode).limit(1).get();

        if (codesSnap.empty) {
            return new Response(JSON.stringify({ error: 'Invalid code. Please check and try again.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const codeRef = codesSnap.docs[0].ref;
        const userRef = db.collection('users').doc(uid);

        // Festival schedule, read once up front: a block ticket's expiry is
        // tied to its screening date, and a day pass unlocks every block on
        // that day.
        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        const scheduleDays = daysSnap.docs.map(d => d.data() as { day?: number; blocks?: any[] });
        const findBlockById = (id: string) => scheduleDays.flatMap(d => d.blocks || []).find(b => b?.id === id);
        const expiryFor = (block: any) => blockAccessExpiry({
            nowMs: Date.now(),
            screeningStartTime: block?.screeningStartTime || block?.watchPartyStartTime,
            rewatchWindowMs: FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS,
        }).toISOString();

        type RedeemResult =
            | { ok: false; error: string }
            | { ok: true; type: string; blockTitle?: string; dayNumber?: number };

        const result: RedeemResult = await db.runTransaction(async (tx) => {
            const codeDoc = await tx.get(codeRef);
            const codeData = codeDoc.data();
            if (!codeDoc.exists || !codeData) {
                return { ok: false, error: 'Invalid code. Please check and try again.' };
            }
            if (codeData.isRedeemed) {
                return { ok: false, error: 'This code has already been redeemed.' };
            }

            const userDoc = await tx.get(userRef);
            const userData = userDoc.data() || {};

            if (codeData.type === 'full_pass') {
                tx.set(userRef, {
                    hasFestivalAllAccess: true,
                    festivalAccessGrantedAt: new Date().toISOString(),
                    festivalAccessSource: 'ticket_code',
                }, { merge: true });
            } else if (codeData.type === 'day_pass') {
                // FIX (Oct 2026 audit): day passes used to only record the day
                // number, which nothing else in the app ever checked — so a
                // day-pass holder got no access at all. Now the pass unlocks
                // every block scheduled that day, exactly like buying each one.
                const currentDays: number[] = userData.unlockedFestivalDays || [];
                const dayBlocks = scheduleDays.find(d => d.day === codeData.dayNumber && !(d as any).partnerId)?.blocks || [];
                const currentBlocks = userData.unlockedBlocks || {};
                const addedBlocks: Record<string, string> = {};
                for (const b of dayBlocks) if (b?.id) addedBlocks[b.id] = expiryFor(b);
                tx.set(userRef, {
                    unlockedFestivalDays: currentDays.includes(codeData.dayNumber) ? currentDays : [...currentDays, codeData.dayNumber],
                    unlockedBlocks: { ...currentBlocks, ...addedBlocks },
                }, { merge: true });
            } else if (codeData.type === 'block') {
                // Valid through the screening + rewatch week (not 14 days
                // from redemption — early redeemers used to be locked out).
                const currentBlocks = userData.unlockedBlocks || {};
                const updates: Record<string, any> = {
                    unlockedBlocks: { ...currentBlocks, [codeData.blockId]: expiryFor(findBlockById(codeData.blockId)) },
                };
                if (Array.isArray(codeData.movieKeys) && codeData.movieKeys.length > 0) {
                    const currentKeys: string[] = userData.unlockedWatchPartyKeys || [];
                    const merged = Array.from(new Set([...currentKeys, ...codeData.movieKeys]));
                    updates.unlockedWatchPartyKeys = merged;
                }
                tx.set(userRef, updates, { merge: true });
            } else {
                return { ok: false, error: 'Unrecognized code type.' };
            }

            tx.update(codeRef, {
                isRedeemed: true,
                redeemedBy: uid,
                redeemedAt: new Date().toISOString(),
            });

            return { ok: true, type: codeData.type, blockTitle: codeData.blockTitle, dayNumber: codeData.dayNumber };
        });

        if (!result.ok) {
            return new Response(JSON.stringify({ error: result.error }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ success: true, type: result.type, blockTitle: result.blockTitle, dayNumber: result.dayNumber }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[redeem-ticket-code] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message || 'Something went wrong. Please try again.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
