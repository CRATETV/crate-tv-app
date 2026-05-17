
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  try {
    const { movieKey, seconds, userId } = await request.json();
    
    if (!movieKey || seconds === undefined || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Database connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection is not available.");

    const userRef = db.collection('users').doc(userId);
    
    await userRef.set({
      playbackProgress: {
        [movieKey]: seconds
      }
    }, { merge: true });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error updating playback progress:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
