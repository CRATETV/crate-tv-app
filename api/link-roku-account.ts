// This is a Vercel Serverless Function
// Path: /api/link-roku-account
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { uid, rokuLinkCode } = await request.json();

    if (!uid || !rokuLinkCode) {
      return new Response(JSON.stringify({ error: 'User ID and Roku Link Code are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const batch = db.batch();

    // 1. Update the user's document with their Roku device ID
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, { rokuDeviceId: rokuLinkCode });

    // 2. Create a reverse-lookup document for the Roku device to easily check its link status
    const linkRef = db.collection('roku_links').doc(rokuLinkCode);
    batch.set(linkRef, { 
        userId: uid,
        linkedAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    return new Response(JSON.stringify({ success: true, message: 'Device linked successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error linking Roku account:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}