import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';

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

        const granted = await db.runTransaction(async (tx) => {
            const inviteDoc = await tx.get(inviteRef);
            if (!inviteDoc.exists) return false;
            const inviteData = inviteDoc.data();
            if (!inviteData || inviteData.accessGranted) return false;

            const userRef = db.collection('users').doc(uid);
            if (inviteData.accessType === 'block' && inviteData.blockId) {
                const expiry = new Date();
                expiry.setFullYear(expiry.getFullYear() + 1);
                tx.set(userRef, {
                    unlockedBlocks: { [inviteData.blockId]: expiry.toISOString() },
                }, { merge: true });
            } else {
                tx.set(userRef, { hasFestivalAllAccess: true }, { merge: true });
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
