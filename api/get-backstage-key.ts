import { getAdminDb } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { getBackstageKey } from './_lib/backstage.js';

// Admin-only: returns a party's director backstage key so the Watch Party
// Manager can show/copy it (it is no longer on the public party record).
export async function POST(request: Request) {
    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    try {
        const { movieKey, password } = await request.json();
        if (!(await verifyAdminPassword(password))) return json({ error: 'Unauthorized' }, 401);
        if (!movieKey) return json({ error: 'movieKey is required.' }, 400);
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        return json({ backstageKey: await getBackstageKey(db, String(movieKey)) });
    } catch (e) {
        console.error('[get-backstage-key]', e);
        return json({ error: 'Server error.' }, 500);
    }
}
