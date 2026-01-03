
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();
    if (!movieKey) {
      return new Response(JSON.stringify({ error: "movieKey is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Database connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) {
      throw new Error("Database connection is not available.");
    }
    
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';
    const timestamp = FieldValue.serverTimestamp();
    
    const batch = db.batch();

    // 1. Static Aggregate Counter
    const viewDocRef = db.collection('view_counts').doc(movieKey);
    batch.set(viewDocRef, { 
      count: FieldValue.increment(1),
      lastViewed: timestamp
    }, { merge: true });

    // 2. Location Aggregate
    const locationDocRef = db.collection('view_locations').doc(movieKey);
    batch.set(locationDocRef, {
        [country]: FieldValue.increment(1)
    }, { merge: true });

    // 3. New: Time-Series Event Log (for Spike Detection)
    const eventRef = db.collection('traffic_events').doc();
    batch.set(eventRef, {
        movieKey,
        country,
        timestamp,
        type: 'VIEW'
    });
    
    await batch.commit();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking view:", error);
    return new Response(JSON.stringify({ success: true, warning: "View tracking deferred." }), { status: 200 });
  }
}
