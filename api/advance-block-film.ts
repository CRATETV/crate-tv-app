import { getAdminDb } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { tryAdvanceBlock } from './_lib/watchPartyLifecycle.js';

// Moves a live festival block to its next film.
//
// Called by:
//   • every viewer's browser when its video ends (and again every 30s while
//     it waits) — the server only advances once the film's recorded runtime
//     has actually elapsed, and a transaction makes sure only one call wins;
//   • the every-minute cron (api/update-watch-parties.ts), so a block keeps
//     moving even if no viewer's browser asks;
//   • the admin "Next Film" button, which sends `force: true` plus the admin
//     credential to skip the runtime check (e.g. a film's runtime is missing
//     or wrong in the catalog).
//
// The rules themselves live in api/_lib/watchPartyLifecycle.ts.

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
    try {
        const { partyId, currentIndex, force, adminPassword } = await request.json();
        if (!partyId || typeof currentIndex !== 'number') {
            return json({ error: 'Missing required fields' }, 400);
        }

        let isForced = false;
        if (force === true) {
            if (!(await verifyAdminPassword(adminPassword))) return json({ error: 'Unauthorized' }, 401);
            isForced = true;
        }

        const db = getAdminDb();
        if (!db) return json({ error: 'Database unavailable' }, 500);

        const result = await tryAdvanceBlock(db, { partyId, currentIndex, force: isForced });

        switch (result.kind) {
            case 'advanced':
                console.log(`[ADVANCE] Party ${partyId} → film ${result.nextIndex}${isForced ? ' (forced by admin)' : ''}`);
                return json({ success: true, nextIndex: result.nextIndex, intermissionEnd: result.intermissionEnd });
            case 'already-advanced':
                return json({ success: false, message: 'Index mismatch — another client already advanced', serverIndex: result.serverIndex });
            case 'last-film':
                return json({ success: false, message: 'This is the last film in the block.', lastFilm: true });
            case 'not-live':
                return json({ success: false, message: 'Party is not live.' });
            case 'not-ready':
                return json({ success: false, message: result.message, readyAtMs: result.readyAtMs });
        }
    } catch (error: any) {
        console.error('[ADVANCE] Error:', error);
        logServerError('api/advance-block-film', error);
        return json({ error: error.message }, 500);
    }
}
