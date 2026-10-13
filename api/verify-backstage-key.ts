import { getAdminDb } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { checkBackstageKey } from './_lib/backstage.js';

// Checks a director's backstage key on the server. The browser used to
// compare against a copy of the key it read from the public party record —
// which meant anyone could read the key. Rate-limited against guessing.
export async function POST(request: Request) {
    const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    try {
        if (!rateLimit(`verify-backstage:${getIP(request)}`, 10, 60_000)) return json({ ok: false, error: 'Too many attempts — wait a minute.' }, 429);
        const { movieKey, key } = await request.json();
        if (!movieKey || !key) return json({ ok: false }, 400);
        const db = getAdminDb();
        if (!db) return json({ ok: false, error: 'Service unavailable.' }, 503);
        return json({ ok: await checkBackstageKey(db, String(movieKey), key) });
    } catch (e) {
        console.error('[verify-backstage-key]', e);
        return json({ ok: false, error: 'Server error.' }, 500);
    }
}
