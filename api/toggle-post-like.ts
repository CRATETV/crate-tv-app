import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { postId, actorName, password } = await request.json();

    if (password !== 'cratebio' || !actorName || !postId) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing parameters.' }), { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const postRef = db.collection('actor_posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
        return new Response(JSON.stringify({ error: 'Post not found.' }), { status: 404 });
    }

    const postData = postDoc.data();
    const likes: string[] = postData?.likes || [];

    if (likes.includes(actorName)) {
        // Unlike
        await postRef.update({
            likes: admin.firestore.FieldValue.arrayRemove(actorName)
        });
    } else {
        // Like
        await postRef.update({
            likes: admin.firestore.FieldValue.arrayUnion(actorName)
        });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error toggling post like:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}