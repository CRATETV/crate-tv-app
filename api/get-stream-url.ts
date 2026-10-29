import { getAdminDb, getAdminAuth } from './_lib/firebaseAdmin.js';
import { isPastAvailableUntil } from './_lib/filmAvailability.js';
import { resolveMovieAccess, AccessMode } from './_lib/entitlements.js';
import { signStreamUrl } from './_lib/signStreamUrl.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { findBlock } from './_lib/watchPartyLifecycle.js';
import { checkBackstageKey } from './_lib/backstage.js';
import { pickStreamSource } from './_lib/streamSource.js';

export async function POST(request: Request) {
    try {
        if (!rateLimit(getIP(request), 60, 60_000)) {
            return new Response(JSON.stringify({ error: 'Too many requests.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
        }

        const { movieKey, mode, idToken, backstageKey, episode } = await request.json();
        if (!movieKey) return new Response(JSON.stringify({ error: 'movieKey is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const resolvedMode: AccessMode = mode === 'live' ? 'live' : 'ondemand';

        const auth = getAdminAuth();
        const db = getAdminDb();
        if (!auth || !db) return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

        let granted = false;
        let filmKey: string | null = null;

        if (typeof backstageKey === 'string' && backstageKey.trim() && resolvedMode === 'live') {
            // Directors/hosts joining a live party with the backstage key.
            // They used to be handed the raw, permanent file link in the
            // browser; now they get the same short-lived signed link as
            // everyone else, granted only while the party's key matches.
            const party = (await db.collection('watch_parties').doc(movieKey).get()).data();
            if (party?.status === 'live' && await checkBackstageKey(db, movieKey, backstageKey)) {
                const block = await findBlock(db, movieKey);
                if (block && block.movieKeys.length > 0) {
                    const idx = Math.min(Math.max(0, party.activeMovieIndex ?? 0), block.movieKeys.length - 1);
                    filmKey = block.movieKeys[idx];
                } else {
                    filmKey = movieKey;
                }
                granted = true;
            }
            if (!granted) return new Response(JSON.stringify({ error: 'Invalid backstage key.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        } else {
            if (!idToken) return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            let uid: string;
            try { uid = (await auth.verifyIdToken(idToken)).uid; }
            catch { return new Response(JSON.stringify({ error: 'Invalid session.' }), { status: 401, headers: { 'Content-Type': 'application/json' } }); }
            ({ granted, filmKey } = await resolveMovieAccess(db, { uid, movieKey, mode: resolvedMode }));
        }

        if (!granted || !filmKey) return new Response(JSON.stringify({ error: 'Access denied.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

        // NOTE: filmKey, not movieKey — for a festival block watch party (mode 'live'),
        // movieKey is the block's own id, and filmKey is whichever film within it is
        // actually "active" right now, resolved server-side by resolveMovieAccess.
        const { getApiData } = await import('./_lib/data.js');
        const data = await getApiData({ noCache: false });
        // Past its "Hide automatically after" time: off CRATE for everyone,
        // including people who paid before (api/_lib/filmAvailability.ts).
        if (isPastAvailableUntil(data.movies?.[filmKey], Date.now())) {
            return new Response(JSON.stringify({ error: 'This film is no longer available on CRATE.', unavailable: true }), { status: 410, headers: { 'Content-Type': 'application/json' } });
        }
        // A series' episode is asked for by number (0 = the first) and signed
        // after the same access check as the film; only the on-demand player
        // asks for one.
        const source = pickStreamSource(data.movies?.[filmKey], resolvedMode === 'ondemand' ? episode : undefined);
        if (source.error) return new Response(JSON.stringify({ error: 'Episode not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        const rawUrl: string | undefined = source.url;
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
