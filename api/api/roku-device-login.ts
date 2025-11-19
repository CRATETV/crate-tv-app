import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { email, password, deviceId } = await request.json();

    if (!email || !password || !deviceId) {
      return new Response(JSON.stringify({ error: 'Missing credentials' }), { status: 400 });
    }

    // 1. Verify Password using Firebase REST API (Client SDK emulation)
    // We use the Web API key which should be in your env vars as FIREBASE_API_KEY
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: 'Server Misconfiguration' }), { status: 500 });

    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
    }

    const uid = authData.localId; // The user's Firebase UID

    // 2. Link the Device in Firestore (Same logic as code linking)
    const db = getAdminDb();
    if (db) {
        const batch = db.batch();
        // Link device table
        batch.set(db.collection('roku_links').doc(deviceId), { 
            userId: uid, 
            linkedAt: FieldValue.serverTimestamp(),
            method: 'direct_login'
        });
        // Update user profile
        batch.update(db.collection('users').doc(uid), { rokuDeviceId: deviceId });
        await batch.commit();
    }

    return new Response(JSON.stringify({ success: true, uid }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Login failed' }), { status: 500 });
  }
}