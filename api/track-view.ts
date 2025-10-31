import { getDb } from './_lib/firebase';
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();
    if (!movieKey) {
      return new Response(JSON.stringify({ error: "movieKey is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed.");
    }
    
    const viewDocRef = doc(db, 'view_counts', movieKey);
    
    // Atomically increment the count. If the document doesn't exist, it will be created.
    await setDoc(viewDocRef, { 
      count: increment(1),
      lastViewed: serverTimestamp() // Also track the last time it was viewed
    }, { merge: true });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking view:", error);
    return new Response(JSON.stringify({ error: "Failed to track view." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}