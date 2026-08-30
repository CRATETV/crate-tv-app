// api/get-grant-ledger.ts
// Admin-only read of the grant_ledger collection (Discovery > Grant
// Ledger tab). No client Firestore rule ever existed for this collection
// — same class of bug as jury_reviews/guest_judging, fixed the same way.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { GrantApplication } from '../types.js';

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
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        const snap = await db.collection('grant_ledger').orderBy('dateApplied', 'desc').get();
        const grants: GrantApplication[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as GrantApplication));

        return new Response(JSON.stringify({ grants }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[get-grant-ledger] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
