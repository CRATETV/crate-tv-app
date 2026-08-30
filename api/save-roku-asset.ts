// api/save-roku-asset.ts
// Admin-only write to roku_assets/{movieKey}. Also bumps roku/config's
// _version, matching RokuAssetManager's prior client-side behavior so the
// Roku app picks up the change. See get-roku-assets.ts for context.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { password, movieKey, asset } = await request.json();

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

        if (!movieKey || !asset) {
            return new Response(JSON.stringify({ error: 'movieKey and asset are required' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        await db.collection('roku_assets').doc(movieKey).set({
            ...asset,
            movieKey,
            lastUpdated: FieldValue.serverTimestamp(),
        }, { merge: true });

        await db.collection('roku').doc('config').set({
            _version: FieldValue.increment(1),
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error('[save-roku-asset] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
