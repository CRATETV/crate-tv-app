// This is a Vercel Serverless Function
// It will be accessible at the path /api/toggle-like
import * as admin from 'firebase-admin';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  try {
    const { movieKey, action } = await request.json(); // action is 'like' or 'unlike'
    if (!movieKey || (action !== 'like' && action !== 'unlike')) {
      return new Response(JSON.stringify({ error: "movieKey and action ('like' or 'unlike') are required." }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
      });
    }

    const initError = getInitializationError();
    if (initError) {
        throw new Error(`Firebase Admin connection failed: ${initError}`);
    }
    
    const db = getAdminDb();
    if (!db) {
        throw new Error("Database connection failed. Could not process like.");
    }
    
    const movieDocRef = db.collection('movies').doc(movieKey);
    
    // Atomically increment or decrement the likes count
    const likesIncrement = admin.firestore.FieldValue.increment(action === 'like' ? 1 : -1);
    
    await movieDocRef.update({ 
      likes: likesIncrement,
    });

    return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    const message = error instanceof Error ? error.message : "Failed to toggle like.";
    return new Response(JSON.stringify({ error: message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}