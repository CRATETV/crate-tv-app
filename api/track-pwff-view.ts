// api/track-pwff-view.ts
//
// Server-side counterpart to the client-side pwff_analytics write that
// was failing. Firestore security rules correctly block anonymous
// clients from writing directly to most collections — pwff_analytics
// was one of them, so every single visitor to /pwff or /pwff-philly2026
// was silently failing to increment this counter (and quietly spamming
// error_logs with a permission error each time, which is what the
// automated health check caught). Routing this through the Admin SDK
// server-side, same pattern as api/track-visit.ts, fixes both: the
// counter actually works now, and there's nothing left for the browser
// to be denied permission for.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');

        await db.collection('pwff_analytics').doc('views').set({
            total: FieldValue.increment(1),
            lastView: FieldValue.serverTimestamp(),
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        // Deliberately not calling logServerError here — a failed view-count
        // increment is genuinely low-stakes, and logging it would just
        // recreate the same noisy-error problem this endpoint exists to fix.
        console.error('[track-pwff-view] Failed:', error);
        return new Response(JSON.stringify({ success: false }), { status: 200 });
    }
}
