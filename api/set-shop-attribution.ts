import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { productSlug, productName, filmmakerName, sharePercent, category, sortOrder, remove, removeAttribution, password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!productSlug) {
            return new Response(JSON.stringify({ error: 'productSlug required' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        // Full removal — wipes both revenue attribution and display settings.
        if (remove) {
            await db.collection('shop_attributions').doc(productSlug).delete();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        const docRef = db.collection('shop_attributions').doc(productSlug);

        // Revenue attribution and display grouping (category/order) are
        // independent — a product can have either, both, or neither, so this
        // merges rather than overwrites the whole document.
        const update: Record<string, unknown> = {
            productName: productName || '',
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (removeAttribution) {
            update.filmmakerName = FieldValue.delete();
            update.sharePercent = FieldValue.delete();
        } else if (filmmakerName !== undefined || sharePercent !== undefined) {
            if (!filmmakerName || typeof sharePercent !== 'number' || sharePercent < 0 || sharePercent > 1) {
                return new Response(JSON.stringify({ error: 'Missing or invalid filmmaker/share fields' }), { status: 400 });
            }
            update.filmmakerName = filmmakerName;
            update.sharePercent = sharePercent;
        }

        if (category !== undefined) update.category = category || FieldValue.delete();
        if (sortOrder !== undefined) update.sortOrder = typeof sortOrder === 'number' ? sortOrder : FieldValue.delete();

        await docRef.set(update, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
