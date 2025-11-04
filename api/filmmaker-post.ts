import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { User } from '../types.js';

export async function POST(request: Request) {
  try {
    const { userId, password, content, imageUrl } = await request.json();

    if (password !== 'cratedirector') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (!userId || !content) {
      return new Response(JSON.stringify({ error: 'User ID and content are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Fetch user profile to get their name and avatar
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return new Response(JSON.stringify({ error: 'User profile not found.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const userData = userDoc.data() as User;

    const newPost = {
      filmmakerName: userData.name,
      avatarId: userData.avatar,
      content,
      imageUrl: imageUrl || '',
      timestamp: FieldValue.serverTimestamp(),
      likes: [],
    };

    await db.collection('filmmaker_posts').add(newPost);

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error creating filmmaker post:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}