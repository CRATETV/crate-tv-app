import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

// Public, unauthenticated — the shop page needs this to group/order
// products for every visitor, not just admins. Deliberately returns only
// display fields (category, sortOrder), never filmmakerName/sharePercent,
// which stay behind admin auth in get-shop-revenue-summary.ts.
export async function GET(request: Request) {
    try {
        const initError = getInitializationError();
        if (initError) {
            return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        const db = getAdminDb();
        if (!db) {
            return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        const snapshot = await db.collection('shop_attributions').get();
        const items = snapshot.docs
            .map(doc => ({
                productSlug: doc.id,
                category: doc.data().category as string | undefined,
                sortOrder: doc.data().sortOrder as number | undefined,
            }))
            .filter(item => item.category !== undefined || item.sortOrder !== undefined);

        return new Response(JSON.stringify({ items }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
}
