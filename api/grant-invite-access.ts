import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { blockAccessExpiry } from './_lib/watchPartyRules.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types.js';
import { festivalPassExpiryFor, festivalPassOnSale } from './_lib/festivalPass.js';
import { PASS_BELONGS_TO_FESTIVAL_MS } from './_lib/festivalHelpRules.js';
import { sendEmailConfirmation } from './_lib/emailVerify.js';
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
        let emailConfirmed = false;
        try {
            const decoded = await auth.verifyIdToken(idToken);
            uid = decoded.uid;
            email = decoded.email;
            emailConfirmed = decoded.email_verified === true;
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
        const passSale = festivalPassOnSale(pwffBlocks, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS);
        const firstStartMs = Math.min(...pwffBlocks.map((b: any) => Date.parse(String(b?.screeningStartTime || b?.watchPartyStartTime || ''))).filter(Number.isFinite));

        let needsConfirmation = false;
        const granted = await db.runTransaction(async (tx) => {
            const inviteDoc = await tx.get(inviteRef);
            if (!inviteDoc.exists) return false;
            const inviteData = inviteDoc.data();
            if (!inviteData || inviteData.accessGranted) return false;
            // Anyone can sign up with an invited person's email, so it must be
            // confirmed first (a confirmation link is emailed below).
            if (!emailConfirmed) { needsConfirmation = true; return false; }

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
                // Good for this festival only (see festivalPass.ts). No festival
                // scheduled yet: leave the invite unused so it works once it is.
                if (!passSale.onSale || !passExpiry) return false;
                // An invite from an earlier year's festival doesn't carry over.
                const invitedMs = Date.parse(String(inviteData.invitedAt || ''));
                if (Number.isFinite(invitedMs) && Number.isFinite(firstStartMs) && invitedMs < firstStartMs - PASS_BELONGS_TO_FESTIVAL_MS) return false;
                tx.set(userRef, { hasFestivalAllAccess: true, festivalPassExpiry: passExpiry }, { merge: true });
            }

            tx.update(inviteRef, {
                accessGranted: true,
                accessGrantedAt: new Date().toISOString(),
                uid,
            });
            return true;
        });

        // Send the confirmation link once a day at most.
        if (needsConfirmation && email) {
            const ref = db.collection('pwff_invites').doc(email.toLowerCase().trim());
            const last = Date.parse(String((await ref.get()).data()?.confirmationSentAt || ''));
            if (!Number.isFinite(last) || Date.now() - last > 24 * 60 * 60 * 1000) {
                const sent = await sendEmailConfirmation(auth, email, {
                    continueUrl: 'https://cratetv.net/',
                    why: 'You have a festival invitation waiting on CRATE TV.',
                });
                if (sent) await ref.set({ confirmationSentAt: new Date().toISOString() }, { merge: true });
            }
        }

        return new Response(JSON.stringify({ granted, needsEmailConfirmation: needsConfirmation }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[grant-invite-access] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
