import { getDb } from './_lib/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: "A valid email is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed. Subscription not tracked.");
    }
    
    // Use the email as the document ID to prevent duplicate entries for the same user
    const subscriptionDocRef = doc(db, 'subscriptions', email);
    
    // Set the document with a timestamp. If it already exists, it will be overwritten with a new timestamp.
    await setDoc(subscriptionDocRef, { 
      subscribedAt: serverTimestamp()
    }, { merge: true });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking subscription:", error);
    // Return a success response even on failure so we don't block the user's flow
    // The error is logged on the server for debugging.
    return new Response(JSON.stringify({ success: true, warning: "Subscription tracking failed on server." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}