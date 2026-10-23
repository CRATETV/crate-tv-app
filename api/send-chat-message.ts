
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { checkBackstageKey } from './_lib/backstage.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { resolveAdminCredential } from './_lib/adminSession.js';

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
    // Per-address limit is a loose flood guard only (a theatre full of people
    // on one Wi-Fi shares an address); the real limit is per account, below.
    if (!rateLimit(`send-chat-message:${ip}`, 120, 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many messages — slow down a moment.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const {
      movieKey, userName, userAvatar, text,
      isVerifiedDirector, isAdmin, isSystemMessage, announceDirectorEntry,
      idToken, backstageKey, adminPassword: __raw_adminPassword,
    } = await request.json();
    const adminPassword = await resolveAdminCredential(__raw_adminPassword);

    if (!movieKey || !userName || !userAvatar || (!text && announceDirectorEntry !== true)) {
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
    let senderUid: string | null = null;

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
      let uid: string;
      try {
        uid = (await auth.verifyIdToken(idToken)).uid;
        senderUid = uid;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid or expired session — please refresh.' }), { status: 401 });
      }
      if (!rateLimit(`send-chat-message:user:${uid}`, 20, 60_000)) {
        return new Response(JSON.stringify({ error: 'Too many messages — slow down a moment.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (wantsDirector) {
        const partyDoc = await db.collection('watch_parties').doc(movieKey).get();
        const realKey = partyDoc.data()?.backstageKey;
        if (await checkBackstageKey(db, movieKey, backstageKey)) {
          grantedDirector = true;
        }
      }
    }

    // "The director has entered the chat." Sent by the watch party page once a
    // director's backstage key is accepted. Only a real, checked backstage key
    // can post it, and the fixed message id means each director is announced
    // once per party, however many times they reload or rejoin.
    if (announceDirectorEntry === true) {
      if (!grantedDirector || !senderUid) {
        return new Response(JSON.stringify({ error: 'Only a verified director can be announced.' }), { status: 403 });
      }
      const name = String(userName).trim().slice(0, 60) || 'The director';
      try {
        await db.collection('watch_parties').doc(movieKey).collection('messages')
          .doc(`director-entered-${senderUid}`)
          .create({
            userName: 'CRATE',
            userAvatar,
            text: `🎬 Director ${name} has entered the chat`,
            isVerifiedDirector: false,
            isAdmin: false,
            isSystemMessage: true,
            timestamp: FieldValue.serverTimestamp(),
          });
      } catch (e: any) {
        // Already announced for this party: nothing to do.
        if (e?.code !== 6 && !/already exists/i.test(String(e?.message))) throw e;
      }
      return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
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
