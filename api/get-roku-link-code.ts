// This is a Vercel Serverless Function
// Path: /api/get-roku-link-code
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

// Function to generate a random, user-friendly code
const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; // Excluded O and I for clarity
    const nums = '123456789'; // Excluded 0
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 3; i++) {
        code += nums.charAt(Math.floor(Math.random() * nums.length));
    }
    return code;
};


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return new Response(JSON.stringify({ error: 'Device ID is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // Check if a code already exists for this deviceId to prevent spamming
    const existingCodeQuery = await db.collection('roku_codes').where('deviceId', '==', deviceId).limit(1).get();
    if (!existingCodeQuery.empty) {
        const existingCodeData = existingCodeQuery.docs[0].data();
        // If the code is still valid, return it. Otherwise, let it generate a new one.
        if (existingCodeData.expiresAt && existingCodeData.expiresAt.toDate() > new Date()) {
            return new Response(JSON.stringify({ code: existingCodeData.code }), { status: 200 });
        } else {
            // Delete the expired code before creating a new one
            await existingCodeQuery.docs[0].ref.delete();
        }
    }

    // Generate a unique code
    let code;
    let codeExists = true;
    do {
        code = generateCode();
        const codeDoc = await db.collection('roku_codes').where('code', '==', code).get();
        codeExists = !codeDoc.empty;
    } while (codeExists);

    // Store the code with a TTL (e.g., 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.collection('roku_codes').add({
        code: code,
        deviceId: deviceId,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
    });

    return new Response(JSON.stringify({ code }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error("Error generating Roku link code:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}