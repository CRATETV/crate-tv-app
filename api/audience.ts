// api/audience.ts — Audience Choice voting and the "Who's watching" map.
//
// Free to run: Firestore plus Vercel's built-in location headers (city-level).
//
// GET  ?map=<partyKey>                       → cities the audience joined from (cached 30s)
// GET  ?tally=<blockId>                      → live vote counts for one block, for the
//                                              TV's "Vote from the couch" card (cached 10s).
//                                              Counts and titles only, never who voted.
// POST { action: 'checkin', partyKey, idToken?, viewerId? }
//                                            → counts this viewer's city once per party
// POST { action: 'ballot', blockId, idToken? } → films, voting state, my vote
// POST { action: 'vote', blockId, movieKey, idToken }
//                                            → one vote per account per block (can change
//                                              it until voting closes); ticket holders only
// POST { action: 'results', password }       → admin: tallies for every block with votes
// POST { action: 'award', password, movieKey, awardName, awardYear }
//                                            → admin: puts the award on the film's laurel

import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from './_lib/firebaseAdmin.js';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { logServerError } from './_lib/logError.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { resolveMovieAccess } from './_lib/entitlements.js';
import { assembleAndSyncMasterData } from './publish-data.js';
import { FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types.js';
import { PARTNERS } from './_lib/partners.js';
import { selectPwffDays } from './_lib/partnerRules.js';
import {
    votingState, votingWindow, tallyVotes, audienceVoteId, cityFromHeaders, cityKey, summarizeCities, CityPoint,
} from './_lib/audienceRules.js';

const VOTES = 'audience_votes';
const MAPS = 'audience_map';
const SAFE_KEY = /^[a-zA-Z0-9_-]{1,120}$/;

const json = (body: unknown, status = 200, cache = 'no-store') =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

class AudienceError extends Error { constructor(public status: number, message: string) { super(message); } }

async function uidFrom(idToken: unknown, required: boolean): Promise<string | null> {
    if (typeof idToken !== 'string' || !idToken) {
        if (required) throw new AudienceError(401, 'Sign in to vote.');
        return null;
    }
    try { return (await getAdminAuth()!.verifyIdToken(idToken)).uid; }
    catch { if (required) throw new AudienceError(401, 'Your sign-in expired. Refresh the page and try again.'); return null; }
}

interface BlockRef { id: string; title: string; movieKeys: string[]; festival: string; screeningStartTime?: string; watchPartyStartTime?: string; festivalEndTime?: string; partnerId?: string }

async function allBlocks(db: Firestore): Promise<BlockRef[]> {
    const [daysSnap, settingsSnap, partnersSnap] = await Promise.all([
        db.collection('festival').doc('schedule').collection('days').get(),
        db.collection('content').doc('settings').get(),
        db.collection(PARTNERS).get().catch(() => null),
    ]);
    const names = new Map(partnersSnap?.docs.map(d => [d.id, String(d.data().name || d.id)]) || []);
    const days = daysSnap.docs.map(d => d.data() as { partnerId?: string; blocks?: any[] });
    const pwff = new Set(selectPwffDays(days));
    const out: BlockRef[] = [];
    for (const day of days) for (const b of day.blocks || []) {
        if (!b?.id) continue;
        const festival = pwff.has(day) ? 'PWFF' : day.partnerId ? (names.get(day.partnerId) || day.partnerId) : 'PWFF (earlier)';
        out.push({ ...b, movieKeys: Array.isArray(b.movieKeys) ? b.movieKeys : [], festival });
    }
    const cf = settingsSnap.data()?.crateFestConfig;
    for (const b of cf?.movieBlocks || []) if (b?.id) out.push({ ...b, movieKeys: Array.isArray(b.movieKeys) ? b.movieKeys : [], festival: cf?.title || 'Crate Fest' });
    return out;
}

async function findBlock(db: Firestore, blockId: string): Promise<BlockRef> {
    if (!SAFE_KEY.test(blockId)) throw new AudienceError(400, 'Unknown block.');
    const block = (await allBlocks(db)).find(b => b.id === blockId);
    if (!block) throw new AudienceError(404, 'Unknown block.');
    return block;
}

async function filmCards(db: Firestore, keys: string[]) {
    const snaps = await Promise.all(keys.map(k => db.collection('movies').doc(k).get()));
    return snaps.map((s, i) => {
        const m = s.data() || {};
        return { movieKey: keys[i], title: m.title || 'Untitled', director: m.director || '', poster: m.poster || '', awardName: m.awardName || null, awardYear: m.awardYear || null };
    });
}

// ─── Live tally (TV) ──────────────────────────────────────────────────────

async function liveTally(blockId: string): Promise<Response> {
    try {
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const block = await findBlock(db, blockId);
        if (block.movieKeys.length < 2) return json({ state: 'none' }, 200, 'public, s-maxage=60');
        const state = votingState(block, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS, Date.now());
        const votesSnap = await db.collection(VOTES).where('blockId', '==', block.id).get();
        const tally = tallyVotes(block.movieKeys, votesSnap.docs.map(d => ({ movieKey: d.data().movieKey })));
        const titles = new Map((await filmCards(db, block.movieKeys)).map(f => [f.movieKey, f.title]));
        return json({
            state, title: block.title, total: tally.total,
            results: tally.results.slice(0, 5).map(r => ({ title: titles.get(r.movieKey) || 'Untitled', votes: r.votes, share: r.share })),
        }, 200, 'public, s-maxage=10, stale-while-revalidate=20');
    } catch (e) {
        if (e instanceof AudienceError) return json({ error: e.message }, e.status);
        logServerError('api/audience:tally', e);
        return json({ error: 'Results unavailable.' }, 500);
    }
}

// ─── Map ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const tallyId = new URL(request.url).searchParams.get('tally');
    if (tallyId !== null) return liveTally(tallyId);
    try {
        const partyKey = new URL(request.url).searchParams.get('map') || '';
        if (!SAFE_KEY.test(partyKey)) return json({ error: 'Unknown watch party.' }, 400);
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const doc = (await db.collection(MAPS).doc(partyKey).get()).data();
        const points: CityPoint[] = Object.values((doc?.cities || {}) as Record<string, CityPoint>);
        return json({ points, summary: summarizeCities(points) }, 200, 'public, s-maxage=30, stale-while-revalidate=60');
    } catch (e) {
        logServerError('api/audience:map', e);
        return json({ error: 'Map unavailable.' }, 500);
    }
}

// ─── Actions ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getIP(request);
        if (!rateLimit(`audience:${ip}`, 60, 60_000)) return json({ error: 'Too many requests — try again in a minute.' }, 429);
        const body = await request.json().catch(() => ({}));
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);

        switch (body?.action) {
            case 'checkin': {
                const partyKey = String(body.partyKey || '');
                if (!SAFE_KEY.test(partyKey)) throw new AudienceError(400, 'Unknown watch party.');
                const place = cityFromHeaders(n => request.headers.get(n));
                if (!place) return json({ counted: false });
                const uid = await uidFrom(body.idToken, false);
                const viewerId = typeof body.viewerId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(body.viewerId) ? body.viewerId : null;
                const who = uid ? `u:${uid}` : viewerId ? `v:${viewerId}` : null;
                if (!who) return json({ counted: false });
                if (!(await db.collection('watch_parties').doc(partyKey).get()).exists) return json({ counted: false });
                // Only a one-way fingerprint is stored — never the account, device id or IP.
                const seenId = createHash('sha256').update(`${partyKey}|${who}`).digest('hex').slice(0, 32);
                const mapRef = db.collection(MAPS).doc(partyKey);
                const seenRef = mapRef.collection('seen').doc(seenId);
                const key = cityKey(place);
                const counted = await db.runTransaction(async tx => {
                    if ((await tx.get(seenRef)).exists) return null;
                    tx.set(seenRef, { at: FieldValue.serverTimestamp() });
                    tx.set(mapRef, {
                        cities: { [key]: { ...place, viewers: FieldValue.increment(1) } },
                        updatedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    return true;
                });
                return json(counted === null ? { counted: false, already: true } : { counted: true });
            }

            case 'ballot': {
                const block = await findBlock(db, String(body.blockId || ''));
                const uid = await uidFrom(body.idToken, false);
                const state = votingState(block, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS, Date.now());
                const films = await filmCards(db, block.movieKeys);
                let myVote: string | null = null;
                let canVote = false;
                if (uid) {
                    myVote = (await db.collection(VOTES).doc(audienceVoteId(block.id, uid)).get()).data()?.movieKey || null;
                    canVote = (await resolveMovieAccess(db, { uid, movieKey: block.id, mode: 'live' })).granted;
                }
                return json({
                    blockId: block.id, title: block.title, festival: block.festival, state,
                    closesAt: votingWindow(block, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS) ? new Date(votingWindow(block, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS)!.closesMs).toISOString() : null,
                    films: films.map(({ awardName, awardYear, ...f }) => f), myVote, canVote, signedIn: !!uid,
                });
            }

            case 'vote': {
                const uid = await uidFrom(body.idToken, true);
                const block = await findBlock(db, String(body.blockId || ''));
                const movieKey = String(body.movieKey || '');
                if (!block.movieKeys.includes(movieKey)) throw new AudienceError(400, 'That film isn’t in this block.');
                if (block.movieKeys.length < 2) throw new AudienceError(400, 'This block has only one film.');
                const state = votingState(block, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS, Date.now());
                if (state !== 'open') throw new AudienceError(409, state === 'closed' ? 'Voting for this block has closed.' : 'Voting opens when the screening starts.');
                if (!(await resolveMovieAccess(db, { uid: uid!, movieKey: block.id, mode: 'live' })).granted) {
                    throw new AudienceError(403, 'Only ticket holders for this block can vote.');
                }
                await db.collection(VOTES).doc(audienceVoteId(block.id, uid!)).set({
                    blockId: block.id, uid, movieKey, updatedAt: FieldValue.serverTimestamp(),
                });
                return json({ success: true, myVote: movieKey });
            }

            case 'results': {
                if (!(await isMasterAdmin(body.password))) return json({ error: 'Unauthorized' }, 401);
                const [blocks, votesSnap] = await Promise.all([allBlocks(db), db.collection(VOTES).get()]);
                const byBlock = new Map<string, { movieKey: string }[]>();
                for (const d of votesSnap.docs) {
                    const v = d.data();
                    if (!byBlock.has(v.blockId)) byBlock.set(v.blockId, []);
                    byBlock.get(v.blockId)!.push({ movieKey: v.movieKey });
                }
                const now = Date.now();
                const relevant = blocks.filter(b => b.movieKeys.length >= 2 && (byBlock.has(b.id) || votingState(b, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS, now) === 'open'));
                const out = await Promise.all(relevant.map(async b => {
                    const tally = tallyVotes(b.movieKeys, byBlock.get(b.id) || []);
                    const films = new Map((await filmCards(db, b.movieKeys)).map(f => [f.movieKey, f]));
                    return {
                        blockId: b.id, title: b.title, festival: b.festival,
                        state: votingState(b, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS, now),
                        total: tally.total, leaders: tally.leaders,
                        results: tally.results.map(r => ({ ...r, ...films.get(r.movieKey) })),
                    };
                }));
                return json({ blocks: out });
            }

            case 'award': {
                if (!(await isMasterAdmin(body.password))) return json({ error: 'Unauthorized' }, 401);
                const movieKey = String(body.movieKey || '');
                if (!SAFE_KEY.test(movieKey)) throw new AudienceError(400, 'Unknown film.');
                const ref = db.collection('movies').doc(movieKey);
                if (!(await ref.get()).exists) throw new AudienceError(404, 'Unknown film.');
                const awardName = String(body.awardName || 'Audience Choice Award').trim().slice(0, 60);
                const awardYear = String(body.awardYear || new Date().getFullYear()).trim().slice(0, 4);
                await ref.set({ awardName, awardYear }, { merge: true });
                try { await assembleAndSyncMasterData(db); } catch (e) { console.error('[audience] catalog republish failed:', e); }
                return json({ success: true, awardName, awardYear });
            }

            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e) {
        if (e instanceof AudienceError) return json({ error: e.message }, e.status);
        console.error('[audience] error:', e);
        logServerError('api/audience', e);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
