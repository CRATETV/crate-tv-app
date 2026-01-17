
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, userName, userAvatar, text, isVerifiedDirector } = await request.json();

    if (!movieKey || !userName || !userAvatar || !text) {
      return new Response(JSON.stringify({ error: 'Missing required fields for chat message.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const newMessage = {
      userName,
      userAvatar,
      text,
      isVerifiedDirector: isVerifiedDirector === true,
      timestamp: FieldValue.serverTimestamp(),
    };

    await db.collection('watch_parties').doc(movieKey).collection('messages').add(newMessage);

    return new Response(JSON.stringify({ success: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error sending chat message:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
