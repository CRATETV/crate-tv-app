// Counts one read of a published Unpack story. Called by the story page after the
// visitor has stayed a few seconds. Public on purpose; it can only add 1 to a real,
// published story, and each visitor is limited. The counts are only readable by the owner.
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { STATS_COLLECTION, validStoryId, dayKey } from './_lib/zineStats.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request) {
    try {
        if (!rateLimit(`zine-view:${getIP(request) || 'unknown'}`, 30, 10 * 60_000)) return json({ ok: false }, 429);
        const body = await request.json().catch(() => ({}));
        if (!validStoryId(body?.id)) return json({ ok: false }, 400);
        if (getInitializationError()) return json({ ok: false }, 503);
        const db = getAdminDb();
        if (!db) return json({ ok: false }, 503);

        const story = await db.collection('editorial_stories').doc(body.id).get();
        if (!story.exists || story.data()?.status === 'draft') return json({ ok: false }, 404);

        await db.collection(STATS_COLLECTION).doc(body.id).set({
            views: FieldValue.increment(1),
            days: { [dayKey(new Date())]: FieldValue.increment(1) },
        }, { merge: true });
        return json({ ok: true });
    } catch (e) {
        console.error('[zine-view]', e);
        return json({ ok: false }, 500);
    }
}
