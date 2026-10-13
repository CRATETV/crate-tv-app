import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';
import { tryAutoEnd } from './_lib/watchPartyLifecycle.js';

// Ends a watch party a few minutes after its last film finishes.
//
// Safe for any viewer's browser to call: it trusts nothing from the caller
// except the party id, and re-derives "is this genuinely over?" from the
// server's own records (see tryAutoEnd in api/_lib/watchPartyLifecycle.ts).
// The every-minute cron also calls the same function directly, so parties
// end on time even when nobody is watching.

export async function POST(request: Request) {
    try {
        const { partyId } = await request.json();
        if (!partyId) {
            return new Response(JSON.stringify({ error: 'partyId is required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        const result = await tryAutoEnd(db, partyId);
        if (result.kind === 'ended') return new Response(JSON.stringify({ success: true }), { status: 200 });
        if (result.kind === 'already-ended') return new Response(JSON.stringify({ success: true, alreadyEnded: true }), { status: 200 });
        return new Response(JSON.stringify({ success: false, message: result.message }), { status: 200 });
    } catch (error) {
        console.error('[AUTO-END] Error:', error);
        logServerError('api/auto-end-watch-party', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
