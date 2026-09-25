import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
  try {
    const { password: __raw_password } = await request.json();
    const password = await resolveAdminCredential(__raw_password);

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;

    if (password && (password === primaryAdminPassword || password === masterPassword)) {
        isAuthenticated = true;
    } else if (password) {
        for (const key in process.env) {
            if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                isAuthenticated = true;
                break;
            }
        }
    }

    const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD || Object.keys(process.env).some(key => key.startsWith('ADMIN_PASSWORD_'));
    // SECURITY: removed "setup mode" — a missing ADMIN_PASSWORD env var used to
    // unlock this endpoint for everyone. Now a missing password just means locked.
    void anyPasswordSet;

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const initError = getInitializationError();
    if (initError) {
        return new Response(JSON.stringify({ shopRequests: [], warning: initError }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const db = getAdminDb();
    if (!db) {
        return new Response(JSON.stringify({ shopRequests: [], warning: "Database connection unavailable." }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const snapshot = await db.collection('shop_requests').orderBy('requestDate', 'desc').get();
    const shopRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return new Response(JSON.stringify({ shopRequests }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Shop requests fetch error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
