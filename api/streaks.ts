// api/streaks.ts — watch streaks and badges (fun only: they never unlock anything paid).
//
// POST { action: 'record', idToken, kind: 'party' | 'film', key }
//   Called by the browser after 5 minutes of real watching. The server checks
//   the viewer really has access (and, for a watch party, that it's live)
//   before counting anything. Returns any badges just earned.
// POST { action: 'mine', idToken } → streak, badges, festival progress, nudge.
//
// Stored server-side only, in user_streaks/{uid} (not readable or writable by browsers).

import { getAdminDb, getAdminAuth } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { recordWatch, streakSummary } from './_lib/streaks.js';
const SAFE_KEY = /^[a-zA-Z0-9_-]{1,120}$/;

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

class StreakError extends Error { constructor(public status: number, message: string) { super(message); } }

async function uidFrom(idToken: unknown): Promise<string> {
    if (typeof idToken !== 'string' || !idToken) throw new StreakError(401, 'Please sign in.');
    try { return (await getAdminAuth()!.verifyIdToken(idToken)).uid; }
    catch { throw new StreakError(401, 'Your sign-in expired.'); }
}

export async function POST(request: Request) {
    try {
        if (!rateLimit(`streaks:${getIP(request)}`, 60, 60_000)) return json({ error: 'Too many requests.' }, 429);
        const body = await request.json().catch(() => ({}));
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const uid = await uidFrom(body.idToken);

        switch (body.action) {
            case 'record': {
                const kind = body.kind === 'party' ? 'party' : body.kind === 'film' ? 'film' : null;
                const key = String(body.key || '');
                if (!kind || !SAFE_KEY.test(key)) throw new StreakError(400, 'Unknown film.');
                if (!rateLimit(`streaks-record:${uid}`, 30, 60 * 60 * 1000)) return json({ counted: false, added: [] });
                return json(await recordWatch(db, uid, kind, key));
            }
            case 'mine':
                return json(await streakSummary(db, uid));
            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e) {
        if (e instanceof StreakError) return json({ error: e.message }, e.status);
        console.error('[streaks] error:', e);
        logServerError('api/streaks', e);
        return json({ error: 'Something went wrong.' }, 500);
    }
}
