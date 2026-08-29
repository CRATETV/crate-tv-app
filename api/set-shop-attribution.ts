import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { productSlug, productName, filmmakerName, sharePercent, remove, password } = await request.json();

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

        if (remove) {
            await db.collection('shop_attributions').doc(productSlug).delete();
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        if (!filmmakerName || typeof sharePercent !== 'number' || sharePercent < 0 || sharePercent > 1) {
            return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400 });
        }

        await db.collection('shop_attributions').doc(productSlug).set({
            productName: productName || '',
            filmmakerName,
            sharePercent,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
