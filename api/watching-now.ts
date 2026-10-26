// GET /api/watching-now?id=<party id>  →  { watchingNow, watchedTogether }
//
// How many people are watching a watch party RIGHT NOW: their video is
// playing and the tab is open (heartbeat in the last 45 seconds, see
// hooks/useWatchHeartbeat.ts). Shown to viewers on the party page; the
// admin panel shows the same number. Not people sitting in the lobby.
// Only a count leaves the server, and it's cached for 15 seconds.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { computeWatchPartyStats } from './_lib/watchPartyStats.js';

const cache = new Map<string, { at: number; value: number; total: number }>();

export async function GET(request: Request) {
    const id = (new URL(request.url).searchParams.get('id') || '').trim();
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=15, max-age=10' };
    if (!id || id.length > 200 || /[\/]/.test(id)) return new Response(JSON.stringify({ watchingNow: 0 }), { status: 400, headers });
    try {
        const hit = cache.get(id);
        if (hit && Date.now() - hit.at < 15_000) return new Response(JSON.stringify({ watchingNow: hit.value, watchedTogether: hit.total }), { headers });
        if (getInitializationError()) throw new Error('db');
        const db = getAdminDb();
        if (!db) throw new Error('db');
        const { watchingNow, uniqueViewers } = await computeWatchPartyStats(db, id);
        cache.set(id, { at: Date.now(), value: watchingNow, total: uniqueViewers });
        if (cache.size > 500) cache.clear();
        return new Response(JSON.stringify({ watchingNow, watchedTogether: uniqueViewers }), { headers });
    } catch {
        return new Response(JSON.stringify({ watchingNow: 0 }), { status: 200, headers: { ...headers, 'Cache-Control': 'no-store' } });
    }
}
