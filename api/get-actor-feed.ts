import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import { ActorPost } from '../types';

export async function POST(request: Request) {
  try {
    const { actorName, password } = await request.json();

    if (password !== 'cratebio' || !actorName) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Fetch a larger batch of recent posts (by document ID, which is roughly chronological) and sort in code.
    // This avoids a hard dependency on a Firestore index for 'timestamp', which can cause the function to crash if not present.
    const postsSnapshot = await db.collection('actor_posts').limit(150).get();
    
    const posts: ActorPost[] = [];
    postsSnapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() } as ActorPost);
    });

    // Sort all fetched posts in descending order by timestamp to ensure chronological order.
    posts.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA; // Descending
    });

    // Return only the 50 most recent posts after sorting.
    const recentPosts = posts.slice(0, 50);

    return new Response(JSON.stringify({ posts: recentPosts }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Error fetching actor feed:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}