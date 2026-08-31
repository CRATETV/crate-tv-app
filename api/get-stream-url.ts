import { getAdminDb, getAdminAuth } from './_lib/firebaseAdmin.js';
import { resolveMovieAccess, AccessMode } from './_lib/entitlements.js';
import { signStreamUrl } from './_lib/signStreamUrl.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';

export async function POST(request: Request) {
    try {
        if (!rateLimit(getIP(request), 60, 60_000)) {
            return new Response(JSON.stringify({ error: 'Too many requests.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }

        const { movieKey, mode, idToken } = await request.json();
        if (!idToken) return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        if (!movieKey) return new Response(JSON.stringify({ error: 'movieKey is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const resolvedMode: AccessMode = mode === 'live' ? 'live' : 'ondemand';

        const auth = getAdminAuth();
        const db = getAdminDb();
        if (!auth || !db) return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

        let uid: string;
        try { uid = (await auth.verifyIdToken(idToken)).uid; }
        catch { return new Response(JSON.stringify({ error: 'Invalid session.' }), { status: 401, headers: { 'Content-Type': 'application/json' } }); }

        const { granted, filmKey } = await resolveMovieAccess(db, { uid, movieKey, mode: resolvedMode });
        if (!granted || !filmKey) return new Response(JSON.stringify({ error: 'Access denied.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

        // NOTE: filmKey, not movieKey — for a festival block watch party (mode 'live'),
        // movieKey is the block's own id, and filmKey is whichever film within it is
        // actually "active" right now, resolved server-side by resolveMovieAccess.
        const { getApiData } = await import('./_lib/data.js');
        const data = await getApiData({ noCache: false });
        const rawUrl: string | undefined = data.movies?.[filmKey]?.fullMovie;
        if (!rawUrl) return new Response(JSON.stringify({ error: 'Film not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

        const signed = await signStreamUrl(rawUrl);
        if (!signed) return new Response(JSON.stringify({ error: 'Unable to sign stream URL.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

        return new Response(JSON.stringify(signed), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    } catch (e) {
        console.error('[get-stream-url] error:', e);
        return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
