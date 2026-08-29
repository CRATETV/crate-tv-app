import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { items, password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return new Response(JSON.stringify({ error: 'items required' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const batch = db.batch();
        for (const item of items) {
            if (!item.productSlug || typeof item.sortOrder !== 'number') continue;
            const ref = db.collection('shop_attributions').doc(item.productSlug);
            batch.set(ref, {
                productName: item.productName || '',
                sortOrder: item.sortOrder,
            }, { merge: true });
        }
        await batch.commit();

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
