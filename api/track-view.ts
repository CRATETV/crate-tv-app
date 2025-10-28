
// FIX: Switched from client SDK to Admin SDK for server-side operation.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();
    if (!movieKey) {
      return new Response(JSON.stringify({ error: "movieKey is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) {
        throw new Error(`Firebase Admin connection failed: ${initError}`);
    }
    const db = getAdminDb();
    if (!db) {
      throw new Error("Database connection failed.");
    }
    
    const viewDocRef = db.collection('view_counts').doc(movieKey);
    
    // Atomically increment the count. If the document doesn't exist, it will be created.
    // FIX: Use Admin SDK syntax for increment and serverTimestamp.
    await viewDocRef.set({ 
      count: admin.firestore.FieldValue.increment(1),
      lastViewed: admin.firestore.FieldValue.serverTimestamp() // Also track the last time it was viewed
    }, { merge: true });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking view:", error);
    return new Response(JSON.stringify({ error: "Failed to track view." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
