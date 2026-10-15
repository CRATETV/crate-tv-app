// api/send-to-tv.ts — "Send to TV": open a film on your own Roku from your phone.
//
// HOW IT WORKS
//   1. On cratetv.net a signed-in viewer taps "Send to TV" on a film page.
//      POST { idToken, movieKey, episode? } → we look up the Roku linked to
//      THEIR account (users/{uid}.rokuDeviceId, set when they linked it) and
//      leave a note for it in roku_commands/{deviceId}.
//   2. The Crate TV Roku channel, while open and linked, asks every 10 seconds:
//      GET ?deviceId=… → returns the note once (then deletes it) if it's less
//      than 2 minutes old. The Roku opens the film's page and starts playing
//      (if the viewer has access; otherwise the page shows how to unlock it).
//
// SAFETY
//   - You can only send to the Roku linked to your own account.
//   - The note holds only a film key; access is still checked by the Roku's
//     normal catalogue, so this can't unlock anything.
//   - Rate limited, and notes expire after 2 minutes.

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { logServerError } from './_lib/logError.js';

const COMMANDS = 'roku_commands';
const MAX_AGE_MS = 2 * 60 * 1000;
const SAFE_KEY = /^[a-zA-Z0-9_-]{1,120}$/;
const SAFE_DEVICE = /^[a-zA-Z0-9_.:-]{1,200}$/;

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Website: send a film to my Roku. */
export async function POST(request: Request) {
    try {
        if (!rateLimit(`send-to-tv:${getIP(request)}`, 12, 60_000)) return json({ error: 'Too many requests. Try again in a minute.' }, 429);
        const body = await request.json().catch(() => ({}));
        const movieKey = String(body.movieKey || '');
        if (!SAFE_KEY.test(movieKey)) return json({ error: 'Unknown film.' }, 400);
        const episode = Number.isInteger(body.episode) && body.episode >= 0 && body.episode < 500 ? body.episode : null;

        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) return json({ error: 'Service unavailable.' }, 503);

        let uid = '';
        if (typeof body.idToken === 'string' && body.idToken) {
            try { uid = (await auth.verifyIdToken(body.idToken)).uid; } catch { uid = ''; }
        }
        if (!uid) return json({ error: 'Please sign in first.' }, 401);

        const user = (await db.collection('users').doc(uid).get()).data() || {};
        const deviceId = typeof user.rokuDeviceId === 'string' ? user.rokuDeviceId : '';
        if (!deviceId || !SAFE_DEVICE.test(deviceId)) {
            return json({ error: 'No Roku is linked to your account yet.', needsLink: true }, 409);
        }
        // Make sure that Roku is still linked to this account
        const link = (await db.collection('roku_links').doc(deviceId).get()).data();
        if (!link || link.userId !== uid) {
            return json({ error: 'Your Roku is no longer linked. Link it again from the Account tab on your TV.', needsLink: true }, 409);
        }

        await db.collection(COMMANDS).doc(deviceId).set({
            type: 'open', movieKey, episode, uid,
            sentAtMs: Date.now(), sentAt: FieldValue.serverTimestamp(),
        });
        return json({ success: true });
    } catch (e) {
        logServerError('api/send-to-tv', e);
        return json({ error: 'Could not reach your TV. Please try again.' }, 500);
    }
}

/** Roku: anything for me? Returns the note once, then deletes it. */
export async function GET(request: Request) {
    try {
        const deviceId = new URL(request.url).searchParams.get('deviceId') || '';
        if (!SAFE_DEVICE.test(deviceId)) return json({}, 200);
        if (!rateLimit(`tv-poll:${deviceId}`, 30, 60_000)) return json({}, 200);
        const db = getAdminDb();
        if (!db) return json({}, 200);

        const ref = db.collection(COMMANDS).doc(deviceId);
        const doc = await ref.get();
        if (!doc.exists) return json({}, 200);
        const c = doc.data() || {};
        await ref.delete();
        if (typeof c.sentAtMs !== 'number' || Date.now() - c.sentAtMs > MAX_AGE_MS) return json({}, 200);
        return json({ type: c.type, movieKey: c.movieKey, episode: c.episode ?? null });
    } catch (e) {
        logServerError('api/send-to-tv:poll', e);
        return json({}, 200);
    }
}
