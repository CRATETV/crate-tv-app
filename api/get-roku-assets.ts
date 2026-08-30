// api/get-roku-assets.ts
// Admin-only read of roku_assets (RokuAssetManager's "Asset Forge" tab).
// No client Firestore rule ever existed for this collection — same class
// of bug as jury_reviews/guest_judging/grant_ledger, fixed the same way.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { RokuAsset } from '../types.js';

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

        const snap = await db.collection('roku_assets').get();
        const assets: Record<string, RokuAsset> = {};
        snap.forEach(doc => { assets[doc.id] = doc.data() as RokuAsset; });

        return new Response(JSON.stringify({ assets }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[get-roku-assets] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
