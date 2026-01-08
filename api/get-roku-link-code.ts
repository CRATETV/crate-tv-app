import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; 
    const nums = '123456789'; 
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
      return new Response(JSON.stringify({ error: 'Hardware Identity Missing.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Cloud DB Offline.");

    // Check for existing valid code to reduce collision noise
    const existing = await db.collection('roku_codes').where('deviceId', '==', deviceId).limit(1).get();
    if (!existing.empty) {
        const data = existing.docs[0].data();
        if (data.expiresAt && data.expiresAt.toDate() > new Date()) {
            return new Response(JSON.stringify({ code: data.code }), { status: 200 });
        }
        await existing.docs[0].ref.delete();
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 Minute Window

    await db.collection('roku_codes').add({
        code,
        deviceId,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
    });

    return new Response(JSON.stringify({ code }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error("Roku Handshake Failure:", error);
    return new Response(JSON.stringify({ error: 'Code generation offline.' }), { status: 500 });
  }
}
