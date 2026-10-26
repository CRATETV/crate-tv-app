
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { findBlock } from './_lib/watchPartyLifecycle.js';
import { effectiveStatus, isStaleLive } from './_lib/watchPartyRules.js';

const cache = new Map<string, { response: any, timestamp: number }>();
// 10 seconds. Was 5 minutes, which meant a Roku could take up to 5 minutes
// to notice a party had gone live (it polls every 30s).
const CACHE_TTL = 10 * 1000;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieKey = searchParams.get('movieKey');

    // No movieKey: "is ANY party live right now?" (the Roku asks this every
    // 30s). This used to be an error, which the Roku read as "nothing live"
    // and which could switch its LIVE badge back off.
    if (!movieKey) {
      const hit = cache.get('__any__');
      if (hit && Date.now() - hit.timestamp < CACHE_TTL) return new Response(JSON.stringify(hit.response), { status: 200, headers: { 'Content-Type': 'application/json' } });
      const initErr = getInitializationError();
      const anyDb = initErr ? null : getAdminDb();
      if (!anyDb) return new Response(JSON.stringify({ status: 'waiting', isPlaying: false }), { status: 200 });
      const live = await anyDb.collection('watch_parties').where('status', '==', 'live').limit(20).get();
      // Only film watch parties (what the Roku's Watch Parties row offers),
      // started in the last 6 hours (ignores parties nobody ended).
      const candidates = live.docs
        .filter(d => (d.data().actualStartTime?.toMillis?.() || 0) > Date.now() - 6 * 3600_000)
        .sort((a, b) => (b.data().actualStartTime?.toMillis?.() || 0) - (a.data().actualStartTime?.toMillis?.() || 0));
      let latest: (typeof candidates)[number] | undefined;
      for (const d of candidates) {
        const film = await anyDb.collection('movies').doc(d.id).get();
        const sched = Date.parse(String(film.data()?.watchPartyStartTime || ''));
        if (Number.isFinite(sched) && isStaleLive(d.data(), sched)) continue; // left live from an old test
        if (film.exists && film.data()?.isWatchPartyEnabled === true) { latest = d; break; }
      }
      const secs = (v: any) => (v && typeof v.toDate === 'function') ? Math.floor(v.toDate().getTime() / 1000) : 0;
      const response = latest ? {
        status: 'live', isPlaying: !!latest.data().isPlaying, movieKey: latest.id,
        actualStartTimeSeconds: secs(latest.data().actualStartTime),
        filmStartTimeSeconds: secs(latest.data().filmStartTime) || secs(latest.data().actualStartTime),
        activeMovieIndex: latest.data().activeMovieIndex ?? 0,
      } : { status: 'waiting', isPlaying: false };
      cache.set('__any__', { response, timestamp: Date.now() });
      return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const nowTime = Date.now();
    const cached = cache.get(movieKey);
    if (cached && (nowTime - cached.timestamp < CACHE_TTL)) {
        return new Response(JSON.stringify(cached.response), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    const partyDoc = await db.collection('watch_parties').doc(movieKey).get();
    
    if (!partyDoc.exists) {
      const response = { 
        status: 'waiting',
        isPlaying: false,
        actualStartTime: null
      };
      cache.set(movieKey, { response, timestamp: nowTime });
      return new Response(JSON.stringify(response), { status: 200 });
    }

    const raw = partyDoc.data();
    // A leftover "live"/"ended" from an earlier run (a test never ended, the
    // last screening) counts as waiting for the new scheduled time, same as
    // the website (api/_lib/watchPartyRules.ts).
    const block = await findBlock(db, movieKey);
    const filmDoc = block ? null : await db.collection('movies').doc(movieKey).get();
    const schedStr = filmDoc?.data()?.watchPartyStartTime || (block as any)?.block?.screeningStartTime || (block as any)?.block?.watchPartyStartTime || '';
    const schedMs = Date.parse(String(schedStr));
    const effective = effectiveStatus(raw, Number.isFinite(schedMs) ? schedMs : null);
    const data = effective === raw?.status ? raw : { ...raw, status: effective, isPlaying: false, actualStartTime: null, filmStartTime: null };
    
    // Convert Firestore Timestamp to ISO string for the client
    let actualStartTime = null;
    if (data?.actualStartTime) {
        actualStartTime = data.actualStartTime.toDate().toISOString();
    }

    // Roku can't parse ISO dates easily, so whole seconds are sent as well.
    // filmStartTime is when the CURRENT film started (it differs from
    // actualStartTime for later films in a festival block).
    const toSecs = (v: any) => (v && typeof v.toDate === 'function') ? Math.floor(v.toDate().getTime() / 1000) : 0;
    const response = {
      status: data?.status || 'waiting',
      isPlaying: !!data?.isPlaying,
      actualStartTime: actualStartTime,
      actualStartTimeSeconds: toSecs(data?.actualStartTime),
      filmStartTimeSeconds: toSecs(data?.filmStartTime) || toSecs(data?.actualStartTime),
      activeMovieIndex: data?.activeMovieIndex ?? 0,
      isQALive: !!data?.isQALive,
      currentTime: data?.currentTime || 0,
      // Not every start path records `type`, so check the schedule itself.
      type: block ? 'block' : (data?.type || 'movie')
    };

    cache.set(movieKey, { response, timestamp: nowTime });

    return new Response(JSON.stringify(response), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
    });

  } catch (error) {
    console.error("Get Watch Party Status Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
