// Every 5 minutes (vercel.json): sends the timed emails whose time has come.
// A timed email lives in the Sent folder as "Scheduled" (see api/_lib/mailSchedule.ts).
// Each one is claimed before sending so it can never go out twice; if sending fails
// it is marked "failed" with the reason, so it shows up in Sent instead of vanishing.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { MAIL_COLLECTION } from './_lib/mailLog.js';
import { deliverEmail } from './_lib/mailSend.js';
import { dueScheduled } from './_lib/mailSchedule.js';

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) return new Response('Unauthorized', { status: 401 });
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) return new Response(JSON.stringify({ skipped: 'database offline' }), { status: 200 });

        const snap = await db.collection(MAIL_COLLECTION).where('status', '==', 'scheduled').limit(50).get();
        const due = dueScheduled(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })), Date.now());
        const sent: string[] = [];
        for (const m of due) {
            const ref = db.collection(MAIL_COLLECTION).doc(m.id);
            // Claim it: if someone cancelled it or another run already took it, skip.
            const claimed = await db.runTransaction(async tx => {
                const cur = await tx.get(ref);
                if (!cur.exists || cur.data()?.status !== 'scheduled') return false;
                tx.update(ref, { status: 'sending' });
                return true;
            });
            if (!claimed) continue;
            try {
                await deliverEmail(db, {
                    email: m.to?.[0] || '', subject: m.subject, htmlBody: m.htmlBody,
                    signatureId: m.signatureId || 'none',
                    movieTitle: m.movieTitle, posterUrl: m.posterUrl, synopsis: m.synopsis, movieKey: m.movieKey,
                    existingRecordId: m.id,
                });
                sent.push(m.id);
            } catch (e) {
                console.error('[send-scheduled-mail] failed', m.id, e);
                await ref.update({ status: 'failed', error: e instanceof Error ? e.message : 'Could not send.' }).catch(() => {});
            }
        }
        return new Response(JSON.stringify({ sent: sent.length }), { status: 200 });
    } catch (e) {
        console.error('[send-scheduled-mail]', e);
        return new Response(JSON.stringify({ error: 'failed' }), { status: 500 });
    }
}
