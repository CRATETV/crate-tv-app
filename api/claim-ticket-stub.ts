import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, idToken, movieTitle, posterUrl } = await request.json();

    if (!movieKey || !idToken || !movieTitle || !posterUrl) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);

    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) throw new Error("Database connection failed.");

    // This used to take `userId` straight from the request body and write to
    // that user's document with no verification at all — anyone could claim a
    // stub onto an arbitrary account just by passing a different uid. Verify
    // the caller's own ID token and use ONLY the uid it resolves to.
    let userId: string;
    try {
      userId = (await auth.verifyIdToken(idToken)).uid;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid session.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
