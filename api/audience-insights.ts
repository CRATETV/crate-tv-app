// api/audience-insights.ts
// Where visitors come from + how many viewers come back (Stats tab).
// Body: { password }. Reads the last 30 days of the visit/view log.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword, canUseTab } from './_lib/adminAuth.js';
import { audienceInsights } from './_lib/audienceInsights.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const toMs = (v: any): number | null => {
    if (!v) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    return null;
};

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        if (!(await verifyAdminPassword(password)) || !(await canUseTab(password, ['analytics']))) {
            return json({ error: 'Unauthorized' }, 401);
        }
        const initError = getInitializationError();
        if (initError) return json({ error: initError }, 500);
        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable' }, 500);

        const since = new Date(Date.now() - 30 * 86_400_000);
        const snap = await db.collection('traffic_events').where('timestamp', '>=', since).limit(25_000).get();
        const events = snap.docs.map(d => {
            const x = d.data();
            return { type: x.type, source: x.source, uid: x.uid, tsMs: toMs(x.timestamp) };
        });
        return json({ ...audienceInsights(events, Date.now()), truncated: snap.size >= 25_000 });
    } catch (error) {
        console.error('audience-insights error:', error);
        return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
}
