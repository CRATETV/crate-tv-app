import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FilmmakerPost } from '../types.js';

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();

    if (password !== 'cratedirector' || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const postsSnapshot = await db.collection('filmmaker_posts').orderBy('timestamp', 'desc').limit(50).get();
    
    const posts: FilmmakerPost[] = [];
    postsSnapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() } as FilmmakerPost);
    });

    return new Response(JSON.stringify({ posts }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Error fetching filmmaker feed:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}