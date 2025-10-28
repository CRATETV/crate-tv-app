import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import { ActorPost } from '../types';

export async function POST(request: Request) {
  try {
    const { actorName, password } = await request.json();

    if (password !== 'cratebio' || !actorName) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const postsSnapshot = await db.collection('actor_posts').orderBy('timestamp', 'desc').limit(50).get();
    
    const posts: ActorPost[] = [];
    postsSnapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() } as ActorPost);
    });

    return new Response(JSON.stringify({ posts }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Error fetching actor feed:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}