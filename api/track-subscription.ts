import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: "A valid email is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) {
        // Log the error but don't fail the request, as this is a non-critical tracking event.
        console.warn(`Firebase Admin connection failed, subscription not tracked: ${initError}`);
        return new Response(JSON.stringify({ success: true, warning: "Subscription tracking failed on server due to DB connection issue." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const db = getAdminDb();
    if (!db) {
      // Don't throw, just warn and exit gracefully.
      console.warn("Database connection failed. Subscription not tracked.");
      return new Response(JSON.stringify({ success: true, warning: "Subscription tracking failed on server." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Use the email as the document ID to prevent duplicate entries for the same user
    const subscriptionDocRef = db.collection('subscriptions').doc(email);
    
    // Set the document with a timestamp. If it already exists, it will be overwritten with a new timestamp.
    await subscriptionDocRef.set({ 
      subscribedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking subscription:", error);
    // Return a success response even on failure so we don't block the user's flow
    // The error is logged on the server for debugging.
    return new Response(JSON.stringify({ success: true, warning: "Subscription tracking failed on server." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
