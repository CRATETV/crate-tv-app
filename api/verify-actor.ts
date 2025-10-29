// This is a Vercel Serverless Function
// Path: /api/verify-actor
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';

const portalPassword = 'cratebio';

// Helper to create a URL-friendly slug from a name, consistent with the approval process
const slugify = (name: string): string => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/[\s_-]+/g, '-') // collapse whitespace and replace with -
        .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
};

export async function POST(request: Request) {
  try {
    const { name, password } = await request.json();

    if (password !== portalPassword) {
      return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return new Response(JSON.stringify({ error: 'Actor name is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- New, Efficient Verification Logic ---
    
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Generate the slug from the provided name
    const actorSlug = slugify(name);

    // Directly look up the actor's profile document using the slug
    const actorProfileRef = db.collection('actor_profiles').doc(actorSlug);
    const actorProfileDoc = await actorProfileRef.get();

    if (!actorProfileDoc.exists) {
      return new Response(JSON.stringify({ error: 'Actor profile not found. If you have submitted your profile, it may be pending approval. Please use the Actor Signup page to get started.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Actor is verified if their profile exists
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in verify-actor API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
