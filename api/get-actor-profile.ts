import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { ActorProfile } from '../types.js';

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export async function POST(request: Request) {
  try {
    const { actorName, password } = await request.json();

    if (password !== 'cratebio' || !actorName) {
      return new Response(JSON.stringify({ error: 'Unauthorized or missing actor name.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const actorSlug = slugify(actorName);
    const actorProfileDoc = await db.collection('actor_profiles').doc(actorSlug).get();

    if (!actorProfileDoc.exists) {
      return new Response(JSON.stringify({ error: 'Actor profile not found. If you just signed up, your profile may still be generating. Try again in a minute.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const profile = actorProfileDoc.data() as ActorProfile;

    return new Response(JSON.stringify({ profile }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Error fetching actor profile:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}