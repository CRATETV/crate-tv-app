import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { blockAccessExpiry } from './_lib/watchPartyRules.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types.js';
import { festivalPassExpiryFor } from './_lib/festivalPass.js';
import { selectPwffDays } from './_lib/partnerRules.js';

// Auto-grants festival access to a user whose email is on the PWFF invite
// list, the first time they sign in or sign up. This used to write
// `unlockedBlocks` / `hasFestivalAllAccess` straight from the browser on
// every login — both fields firestore.rules blocks clients from writing
// (hasFestivalAllAccess always was; unlockedBlocks was added alongside
// rentals/unlockedWatchPartyKeys to close the free-movie-access bug). That
// write was silently failing every time, which is why invited users never
// actually got their access and the console kept showing "Missing or
// insufficient permissions." Routed server-side, same pattern as every
// other access grant.
export async function POST(request: Request) {
    try {
        const { idToken } = await request.json();
        if (!idToken) {
            return new Response(JSON.stringify({ error: 'Session required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('Service unavailable.');

        let uid: string;
        let email: string | undefined;
        try {
            const decoded = await auth.verifyIdToken(idToken);
            uid = decoded.uid;
            email = decoded.email;
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid session.' }), { status: 401 });
        }

        if (!email) {
            return new Response(JSON.stringify({ granted: false }), { status: 200 });
        }

        const inviteRef = db.collection('pwff_invites').doc(email.toLowerCase().trim());

        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        const pwffBlocks = selectPwffDays(daysSnap.docs.map(d => d.data() as { partnerId?: string; blocks?: any[] })).flatMap(d => d.blocks || []);
        const passExpiry = festivalPassExpiryFor(pwffBlocks, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS);

        const granted = await db.runTransaction(async (tx) => {
            const inviteDoc = await tx.get(inviteRef);
            if (!inviteDoc.exists) return false;
            const inviteData = inviteDoc.data();
            if (!inviteData || inviteData.accessGranted) return false;

            const userRef = db.collection('users').doc(uid);
            if (inviteData.accessType === 'block' && inviteData.blockId) {
                // Same window as a bought block ticket, not a whole year.
                const block = pwffBlocks.find((b: any) => b?.id === inviteData.blockId);
                const expiry = blockAccessExpiry({
                    nowMs: Date.now(),
                    screeningStartTime: block?.screeningStartTime || block?.watchPartyStartTime,
                    rewatchWindowMs: FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS,
                });
                tx.set(userRef, {
                    unlockedBlocks: { [inviteData.blockId]: expiry.toISOString() },
                }, { merge: true });
            } else {
                // Good for this festival only (see festivalPass.ts).
                tx.set(userRef, { hasFestivalAllAccess: true, festivalPassExpiry: passExpiry }, { merge: true });
            }

            tx.update(inviteRef, {
                accessGranted: true,
                accessGrantedAt: new Date().toISOString(),
                uid,
            });
            return true;
        });

        return new Response(JSON.stringify({ granted }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[grant-invite-access] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
