// This is a Vercel Serverless Function
// Path: /api/check-credit-match
//
// Called once per signup (see AuthContext.signUp) to check whether the name
// someone just typed matches a film's director/producer credit — purely a
// discovery nudge (toast pointing at /filmmaker-signup), never a grant of
// access. The real verification gate stays at filmmaker-signup.ts, which
// requires the same name to be typed again there before any account claims
// are made. No auth required — same public-credit-data trust level as that
// endpoint's own Step 1 check.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie } from '../types.js';
import { findCreditMatch } from './_lib/creditMatch.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';

const cache = {
    data: null as Movie[] | null,
    timestamp: 0,
};
const CACHE_TTL = 300 * 1000; // 5 minutes — this fires on every signup, unlike filmmaker-signup.ts's one-off checks

export async function POST(request: Request) {
    try {
        const ip = getIP(request);
        if (!rateLimit(ip, 20, 60 * 1000)) {
            return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
        }

        const { name } = await request.json();
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return new Response(JSON.stringify({ matched: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        let movies: Movie[];
        const now = Date.now();
        if (cache.data && (now - cache.timestamp < CACHE_TTL)) {
            movies = cache.data;
        } else {
            const initError = getInitializationError();
            if (initError) throw new Error(initError);
            const db = getAdminDb();
            if (!db) throw new Error('DB fail');

            const moviesSnapshot = await db.collection('movies').get();
            movies = moviesSnapshot.docs.map(d => ({ key: d.id, ...d.data() } as Movie));
            cache.data = movies;
            cache.timestamp = now;
        }

        const match = findCreditMatch(movies, name);
        return new Response(JSON.stringify(match ? { matched: true, filmTitle: match.title } : { matched: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
