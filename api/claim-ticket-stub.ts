import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, userId, movieTitle, posterUrl } = await request.json();

    if (!movieKey || !userId || !movieTitle || !posterUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return new Response(JSON.stringify({ error: 'User not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = userDoc.data();
    const ticketStubs = userData?.ticketStubs || [];

    // Check if user already has this stub
    if (ticketStubs.some((stub: any) => stub.movieKey === movieKey)) {
      return new Response(JSON.stringify({ success: true, message: 'Stub already claimed.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newStub = {
      id: `stub_${Date.now()}`,
      movieKey,
      movieTitle,
      date: new Date().toISOString(),
      posterUrl
    };

    await userRef.update({ 
      ticketStubs: FieldValue.arrayUnion(newStub)
    });

    return new Response(JSON.stringify({ success: true, stub: newStub }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Claim Ticket Stub Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
