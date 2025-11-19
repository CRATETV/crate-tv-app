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
    
    // Robustly sanitize the code to handle spaces, dashes, or no separators.
    const sanitizedCode = rokuLinkCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formattedCode = `${sanitizedCode.slice(0, 3)}-${sanitizedCode.slice(3)}`;


    // --- New logic: Find deviceId from the user-friendly code ---
    const codeQuery = await db!.collection('roku_codes').where('code', '==', formattedCode).limit(1).get();
    
    if (codeQuery.empty) {
        return new Response(JSON.stringify({ error: 'Invalid or expired link code. Please try generating a new code on your Roku device.' }), {
            status: 404, headers: { 'Content-Type': 'application/json' }
        });
    }

    const codeDoc = codeQuery.docs[0];
    const codeData = codeDoc.data();

    // Check for expiration
    if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
        await codeDoc.ref.delete(); // Clean up expired code
        return new Response(JSON.stringify({ error: 'This link code has expired. Please generate a new one from your Roku device.' }), { status: 410, headers: { 'Content-Type': 'application/json' }});
    }

    const { deviceId } = codeData;

    if (!deviceId) {
         return new Response(JSON.stringify({ error: 'Code found, but is invalid. Please try again.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }

    const batch = db!.batch();

    // 1. Update the user's document with their Roku device ID
    const userRef = db!.collection('users').doc(uid);
    batch.update(userRef, { rokuDeviceId: deviceId });

    // 2. Create a reverse-lookup document for the Roku device to easily check its link status
    const linkRef = db!.collection('roku_links').doc(deviceId);
    batch.set(linkRef, { 
        userId: uid,
        linkedAt: FieldValue.serverTimestamp()
    });

    // 3. Delete the temporary code now that it has been used
    batch.delete(codeDoc.ref);

    await batch.commit();

    return new Response(JSON.stringify({ success: true, message: 'Device linked successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error linking Roku account:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}