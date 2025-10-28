import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import { ActorProfile } from '../types';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const { actorName, password, content, imageUrl } = await request.json();

    if (password !== 'cratebio') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    if (!actorName || !content) {
      return new Response(JSON.stringify({ error: 'Actor name and content are required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Verify actor exists and get their photo
    const actorSlug = slugify(actorName);
    const actorProfileDoc = await db.collection('actor_profiles').doc(actorSlug).get();
    if (!actorProfileDoc.exists) {
        return new Response(JSON.stringify({ error: 'Actor profile not found.' }), { status: 403 });
    }
    const actorProfile = actorProfileDoc.data() as ActorProfile;

    const newPost = {
      actorName: actorProfile.name,
      actorPhoto: actorProfile.photo, // Use the approved profile photo
      content,
      imageUrl: imageUrl || '',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      likes: [],
    };

    await db.collection('actor_posts').add(newPost);

    return new Response(JSON.stringify({ success: true }), { status: 201 });

  } catch (error) {
    console.error("Error creating actor post:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}