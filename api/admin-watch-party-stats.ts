// Admin → Watch Party Manager → viewership numbers.
//   POST { blockId, password }  →  the stats for that party
// The admin panel used to read every viewer's watch sessions straight from the
// database in the browser. The admin panel has no regular CRATE sign-in, so the
// database refused ("Missing or insufficient permissions"). The server reads
// them instead, after the same admin check the other party actions use.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { computeWatchPartyStats } from './_lib/watchPartyStats.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        const { blockId, password } = await request.json();
        if (!(await verifyAdminPassword(password))) return json({ error: 'Unauthorized' }, 401);
        if (!blockId || typeof blockId !== 'string') return json({ error: 'Missing blockId' }, 400);

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        return json(await computeWatchPartyStats(db, blockId));
    } catch (e) {
        console.error('[admin-watch-party-stats] error:', e);
        return json({ error: 'Could not load viewership stats.' }, 500);
    }
}
