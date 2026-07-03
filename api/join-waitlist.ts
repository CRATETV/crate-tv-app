import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

// Lets someone register interest in a sold-out block. Deliberately simple —
// this doesn't auto-notify when a spot opens (that would need someone to
// actually free up a spot, which doesn't really happen with digital
// capacity limits), it just gives the admin a list of who to reach out to
// if she decides to raise the cap or knows of another way in. Deduped by
// (blockId, uid) so re-clicking "Join Waitlist" doesn't create duplicates.
export async function POST(request: Request) {
    try {
        const { blockId, idToken } = await request.json();
        if (!blockId || !idToken) {
            return new Response(JSON.stringify({ error: 'Missing required fields.' }), { status: 400 });
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

        await db.collection('waitlist').doc(`${blockId}_${uid}`).set({
            blockId,
            uid,
            email: email || null,
            joinedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('[join-waitlist] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
