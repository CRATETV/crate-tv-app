import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

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
    if (!anyPasswordSet) isAuthenticated = true;

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    const initError = getInitializationError();
    if (initError) {
        return new Response(JSON.stringify({ payoutRequests: [], warning: initError }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
    
    const db = getAdminDb();
    if (!db) {
        return new Response(JSON.stringify({ payoutRequests: [], warning: "Database connection unavailable." }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const payoutsSnapshot = await db.collection('payout_requests').orderBy('requestDate', 'desc').get();
    const payoutRequests = payoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return new Response(JSON.stringify({ payoutRequests }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Payouts fetch error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }
}