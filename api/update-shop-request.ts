import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { requestId, status, adminNote, password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    }
    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (status !== 'added' && status !== 'declined') {
        return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);

    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const requestRef = db.collection('shop_requests').doc(requestId);

    await requestRef.update({
        status,
        adminNote: adminNote || '',
        resolvedDate: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error updating shop request:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
