import { getAdminDb } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    const { deviceId, movieKey } = await request.json();
    const db = getAdminDb();
    if (!db) return new Response("DB Error", { status: 500 });

    // Find User
    const linkDoc = await db.collection('roku_links').doc(deviceId).get();
    if (!linkDoc.exists) return new Response("Not Logged In", { status: 401 });
    const uid = linkDoc.data()?.userId;

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const liked = userDoc.data()?.likedMovies || [];
    
    const action = liked.includes(movieKey) ? 'unlike' : 'like';
    
    const batch = db.batch();
    if (action === 'like') {
        batch.update(userRef, { likedMovies: FieldValue.arrayUnion(movieKey) });
        batch.update(db.collection('movies').doc(movieKey), { likes: FieldValue.increment(1) });
    } else {
        batch.update(userRef, { likedMovies: FieldValue.arrayRemove(movieKey) });
        batch.update(db.collection('movies').doc(movieKey), { likes: FieldValue.increment(-1) });
    }
    await batch.commit();

    return new Response(JSON.stringify({ success: true, action }), { status: 200 });
}