import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { postId, userId, password } = await request.json();

    if (password !== 'cratedirector' || !userId || !postId) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing parameters.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const postRef = db.collection('filmmaker_posts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
        return new Response(JSON.stringify({ error: 'Post not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const postData = postDoc.data();
    const likes: string[] = postData?.likes || [];

    if (likes.includes(userId)) {
        // Unlike
        await postRef.update({
            likes: FieldValue.arrayRemove(userId)
        });
    } else {
        // Like
        await postRef.update({
            likes: FieldValue.arrayUnion(userId)
        });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error toggling filmmaker post like:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}