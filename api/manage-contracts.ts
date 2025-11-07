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
    if (!checkAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const db = getAdminDb();
    if (!db) return new Response(JSON.stringify({ error: 'DB connection failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

    const snapshot = await db.collection('contracts').orderBy('uploadedAt', 'desc').get();
    const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return new Response(JSON.stringify({ contracts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(request: Request) {
    if (!checkAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const { fileName, fileUrl } = await request.json();
    if (!fileName || !fileUrl) {
        return new Response(JSON.stringify({ error: 'fileName and fileUrl are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const db = getAdminDb();
    if (!db) return new Response(JSON.stringify({ error: 'DB connection failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    
    await db.collection('contracts').add({
        fileName,
        fileUrl,
        uploadedAt: FieldValue.serverTimestamp()
    });

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

export async function DELETE(request: Request) {
    if (!checkAuth(request)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
         return new Response(JSON.stringify({ error: 'Contract ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const db = getAdminDb();
    if (!db) return new Response(JSON.stringify({ error: 'DB connection failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

    await db.collection('contracts').doc(id).delete();
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// Handle CORS preflight requests
export async function OPTIONS(request: Request) {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
