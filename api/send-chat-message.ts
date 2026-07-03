
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';

// This endpoint used to trust `isVerifiedDirector`, `isAdmin`, and
// `isSystemMessage` straight from the request body with no verification at
// all — anyone could POST here directly (no login required either) and have
// the chat UI render their message with a trusted "Director" or system
// badge in front of the whole live audience. Every one of those claims is
// now checked against something the server itself controls before it's
// allowed into the stored message:
//   - isVerifiedDirector  → the caller must also send the party's actual
//     backstageKey, checked against the real value in Firestore.
//   - isAdmin / isSystemMessage → the caller must send the admin password,
//     same check every other admin-only endpoint already uses.
//   - everything else → the caller must send a valid Firebase ID token, so
//     at minimum every message is tied to a real signed-in account instead
//     of an arbitrary, unauthenticated `userName` string.
export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    if (!rateLimit(`send-chat-message:${ip}`, 20, 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many messages — slow down a moment.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      movieKey, userName, userAvatar, text,
      isVerifiedDirector, isAdmin, isSystemMessage,
      idToken, backstageKey, adminPassword,
    } = await request.json();

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

    const wantsAdmin = isAdmin === true || isSystemMessage === true;
    const wantsDirector = isVerifiedDirector === true;

    let grantedAdmin = false;
    let grantedDirector = false;

    if (wantsAdmin) {
      const validPwd = !!adminPassword &&
        (adminPassword === process.env.ADMIN_PASSWORD || adminPassword === process.env.ADMIN_MASTER_PASSWORD);
      if (!validPwd) {
        return new Response(JSON.stringify({ error: 'Unauthorized admin message.' }), { status: 401 });
      }
      grantedAdmin = true;
    } else {
      // Every non-admin message must come from a real signed-in account —
      // previously this endpoint accepted any `userName` with no proof
      // behind it at all.
      const auth = getAdminAuth();
      if (!idToken || !auth) {
        return new Response(JSON.stringify({ error: 'Sign in required to chat.' }), { status: 401 });
      }
      try {
        await auth.verifyIdToken(idToken);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid or expired session — please refresh.' }), { status: 401 });
      }

      if (wantsDirector) {
        const partyDoc = await db.collection('watch_parties').doc(movieKey).get();
        const realKey = partyDoc.data()?.backstageKey;
        if (realKey && backstageKey && String(backstageKey).toUpperCase() === String(realKey).toUpperCase()) {
          grantedDirector = true;
        }
      }
    }

    const newMessage = {
      userName,
      userAvatar,
      text,
      isVerifiedDirector: grantedDirector,
      isAdmin: grantedAdmin && isAdmin === true,
      isSystemMessage: grantedAdmin && isSystemMessage === true,
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
