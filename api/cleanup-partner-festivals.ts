// api/cleanup-partner-festivals.ts — daily cron (see vercel.json).
//
// Festival in a box: once a partner festival is over — last screening +
// 7-day rewatch window + 7-day grace period — its films are deleted from
// CRATE TV (catalog record + uploaded video and poster), EXCEPT films the
// festival gave permission to keep ("Keep on Crate TV after the festival"
// in the partner portal, like LUNA). Kept films are released into the main
// catalog. Ticket and sales records are never deleted.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';
import { PARTNERS, planPartnerCleanup, runPartnerCleanup } from './_lib/partners.js';
import type { PartnerRecord } from './_lib/partnerRules.js';

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 });
    }
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB unavailable');

        const snap = await db.collection(PARTNERS).get();
        const results: Record<string, unknown> = {};
        for (const doc of snap.docs) {
            const partner = { ...(doc.data() as PartnerRecord), id: doc.id };
            if (!partner.published || partner.cleanup?.deletedAt) continue;
            try {
                const plan = await planPartnerCleanup(db, partner);
                if (!plan.dueAt || Date.now() < Date.parse(plan.dueAt)) continue;
                const done = await runPartnerCleanup(db, partner);
                results[partner.id] = { deleted: done.deletedFilmKeys.length, kept: done.keptFilmKeys.length, failedFiles: done.failedFiles?.length || 0 };
                console.log(`[partner-cleanup] ${partner.id}: deleted ${done.deletedFilmKeys.length}, kept ${done.keptFilmKeys.length}`);
            } catch (e) {
                console.error(`[partner-cleanup] ${partner.id} failed:`, e);
                logServerError('api/cleanup-partner-festivals', e, { partnerId: partner.id });
                results[partner.id] = { error: (e as Error).message };
            }
        }
        return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error('[partner-cleanup]', error);
        return new Response(JSON.stringify({ error: 'Cleanup failed.' }), { status: 500 });
    }
}
