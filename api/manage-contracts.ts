
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const checkAuth = (request: Request) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    return (primaryAdminPassword && token === primaryAdminPassword) || (masterPassword && token === masterPassword);
};

export async function GET(request: Request) {
    if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
    const db = getAdminDb();
    if (!db) return new Response('DB Fail', { status: 500 });
    const snapshot = await db.collection('contracts').orderBy('uploadedAt', 'desc').get();
    const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return new Response(JSON.stringify({ contracts }), { status: 200 });
}

export async function POST(request: Request) {
    if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
    const { fileName, fileUrl } = await request.json();
    const db = getAdminDb();
    if (!db) return new Response('DB Fail', { status: 500 });
    await db.collection('contracts').add({ fileName, fileUrl, uploadedAt: FieldValue.serverTimestamp() });
    return new Response(JSON.stringify({ success: true }), { status: 201 });
}

export async function DELETE(request: Request) {
    if (!checkAuth(request)) return new Response('Unauthorized', { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const db = getAdminDb();
    if (!db || !id) return new Response('Invalid', { status: 400 });
    await db.collection('contracts').doc(id).delete();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
}
