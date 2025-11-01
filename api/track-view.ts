import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();
    if (!movieKey) {
      return new Response(JSON.stringify({ error: "movieKey is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Capture the country code from Vercel's headers
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';

    const initError = getInitializationError();
    if (initError) throw new Error(`Database connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) {
      throw new Error("Database connection is not available.");
    }
    
    // --- Atomically update both view count and location data in a batch ---
    const batch = db.batch();

    // 1. Increment total view count for the movie
    const viewDocRef = db.collection('view_counts').doc(movieKey);
    batch.set(viewDocRef, { 
      count: FieldValue.increment(1),
      lastViewed: FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Increment view count for the specific country
    const locationDocRef = db.collection('view_locations').doc(movieKey);
    // Use dot notation to increment a specific field within the document
    batch.set(locationDocRef, {
        [country]: FieldValue.increment(1)
    }, { merge: true });
    
    await batch.commit();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking view:", error);
    // Even if tracking fails, don't block the user. Log the error for debugging.
    return new Response(JSON.stringify({ success: true, warning: "View tracking failed on server." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}