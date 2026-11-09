// api/send-watchparty-thanks.ts — the "thank you for watching" email.
//   GET  (Vercel cron, daily, Bearer CRON_SECRET): thanks everyone who joined a watch party 12–72 hours ago.
//   POST (admin, { password, action: 'test' }): sends a sample to your own technical email.
// Off until the owner turns it on (settings.thankYouEnabled). Each person is emailed once per film
// (festival_viewers/{film}_{email}.thankedAt). Anyone who unsubscribed from the newsletter is skipped.

import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword, canUseTab } from './_lib/adminAuth.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { escapeHtml } from './_lib/validation.js';
import { ownerEmails } from './_lib/partnerEmails.js';
import { dueViewers, fillThankYou, thankYouSubject, MIN_AGE_MS, MAX_AGE_MS, ViewerRow } from './_lib/thankYou.js';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';
const MAX_PER_RUN = 300;

const toMs = (v: any): number | null => (v?.toMillis ? v.toMillis() : typeof v?._seconds === 'number' ? v._seconds * 1000 : null);

const renderBody = (text: string) => text.split(/\n{2,}/).map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')
    + `<p style="margin:24px 0 0;font-size:12px;color:#888;">You're getting this because you joined a watch party on Crate TV. <a href="https://cratetv.net/unsubscribe" style="color:#888;">Unsubscribe</a></p>`;

async function sendOne(resend: Resend, to: string, film: string, name: string | null | undefined, template: string) {
    const body = fillThankYou(template, { name, film });
    return resend.emails.send({ from: `Crate TV <${fromEmail}>`, to, subject: thankYouSubject(film), html: renderBrandedEmail({ title: 'Thank you', bodyHtml: renderBody(body) }) });
}

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
    try {
        const initError = getInitializationError();
        if (initError) return json({ error: initError }, 500);
        const db = getAdminDb();
        if (!db || !process.env.RESEND_API_KEY) return json({ skipped: true, reason: 'Database or email not configured' });

        const settings = (await db.collection('content').doc('settings').get()).data() || {};
        if (settings.thankYouEnabled !== true) return json({ skipped: true, reason: 'Thank-you email is off' });

        const now = Date.now();
        const snap = await db.collection('festival_viewers').where('lastSeenAt', '>=', new Date(now - MAX_AGE_MS)).where('lastSeenAt', '<=', new Date(now - MIN_AGE_MS)).limit(2000).get();
        const rows: (ViewerRow & { title: string })[] = snap.docs.map(d => { const x = d.data(); return { id: d.id, movieKey: x.movieKey, title: x.movieTitle || 'the film', email: x.email, name: x.name, lastSeenMs: toMs(x.lastSeenAt), thanked: !!x.thankedAt }; });

        // Skip parties that are still live and parties marked as tests.
        const liveKeys = new Set<string>(), skipKeys = new Set<string>();
        for (const key of [...new Set(rows.map(r => r.movieKey).filter(Boolean))]) {
            const [party, movie] = await Promise.all([db.collection('watch_parties').doc(key).get(), db.collection('movies').doc(key).get()]);
            if (party.data()?.status === 'live') liveKeys.add(key);
            if (movie.data()?.isTestParty === true) skipKeys.add(key);
        }
        // Skip anyone who unsubscribed.
        const optedOut = new Set<string>();
        const emails = [...new Set(rows.map(r => (r.email || '').toLowerCase()).filter(Boolean))];
        for (let i = 0; i < emails.length; i += 100) {
            const refs = emails.slice(i, i + 100).map(e => db.collection('zine_subscriptions').doc(e));
            (await db.getAll(...refs)).forEach(s => { if (s.exists && s.data()?.status === 'cancelled') optedOut.add(s.id); });
        }

        const due = dueViewers(rows, now, { liveKeys, skipKeys, optedOut }).slice(0, MAX_PER_RUN) as (ViewerRow & { title: string })[];
        const resend = new Resend(process.env.RESEND_API_KEY);
        let sent = 0, failed = 0;
        for (const r of due) {
            try {
                const res: any = await sendOne(resend, r.email!, r.title, r.name, settings.thankYouMessage);
                if (res?.error) throw new Error(res.error.message || 'send failed');
                await db.collection('festival_viewers').doc(r.id).set({ thankedAt: FieldValue.serverTimestamp() }, { merge: true });
                sent++;
            } catch (e) { failed++; console.error('[thanks] failed for a viewer:', e instanceof Error ? e.message : e); }
        }
        return json({ sent, failed, considered: rows.length });
    } catch (e) {
        console.error('send-watchparty-thanks error:', e);
        return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
}

export async function POST(request: Request) {
    try {
        const { password, action, message } = await request.json();
        if (!(await verifyAdminPassword(password)) || !(await canUseTab(password, ['watchParty']))) return json({ error: 'Unauthorized' }, 401);
        if (action !== 'test') return json({ error: 'Unknown action' }, 400);
        const db = getAdminDb();
        if (!db || !process.env.RESEND_API_KEY) return json({ error: 'Email is not set up on the server.' }, 500);
        const settings = (await db.collection('content').doc('settings').get()).data() || {};
        const to = settings.technicalEmail || ownerEmails()[0] || 'cratetiv@gmail.com';
        const res: any = await sendOne(new Resend(process.env.RESEND_API_KEY), to, 'Your Film', 'Alex Sample', typeof message === 'string' && message.trim() ? message : settings.thankYouMessage);
        if (res?.error) return json({ error: res.error.message || 'Send failed' }, 502);
        return json({ ok: true, to });
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
}
