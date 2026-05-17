import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const generateKey = () => {
    return 'PAY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

export async function POST(request: Request) {
  try {
    const { password, targetName, type } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    if (password !== primaryAdminPassword && password !== masterPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!targetName || !type) {
        return new Response(JSON.stringify({ error: 'Target identity and node type required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline");

    const accessKey = generateKey();
    
    await db.collection('director_payout_keys').add({
        accessKey,
        directorName: targetName,
        status: 'ACTIVE',
        payoutMethod: type, // 'filmmaker' or 'festival'
        requestDate: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ success: true, accessKey }), { status: 200 });

  } catch (error) {
    console.error("Key Generator Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}