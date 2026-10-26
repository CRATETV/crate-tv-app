// POST /api/send-inquiry
// The "Host your festival" (/host) and "Premiere your film" (/premiere) forms.
// Emails the request to the studio inbox (reply goes straight to the sender)
// and keeps a copy in `inquiries` (server only, see firestore.rules catch-all).
// Cleaning and checks: api/_lib/inquiry.ts.
import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { renderBrandedEmail } from './_lib/emailBranding.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { escapeHtml } from './_lib/validation.js';
import { cleanInquiry } from './_lib/inquiry.js';

const FROM_EMAIL = 'studio@cratetv.net';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        if (!rateLimit(`send-inquiry:${getIP(request)}`, 5, 60 * 60_000)) {
            return json({ error: 'Too many requests. Please try again later or email studio@cratetv.net.' }, 429);
        }
        const result = cleanInquiry(await request.json().catch(() => null));
        // Pretend a bot's message went through so it doesn't try again.
        if (!result.ok) return result.spam ? json({ success: true }) : json({ error: result.error }, 400);
        const q = result.inquiry;

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        // Keep a copy first, so nothing is lost if the email has a problem.
        await db.collection('inquiries').add({
            kind: q.kind, name: q.name, email: q.email, message: q.message, link: q.link || null,
            details: Object.fromEntries(q.details), status: 'new', createdAt: FieldValue.serverTimestamp(),
        });

        const studioEmail = (await db.collection('content').doc('settings').get()).data()?.businessEmail || FROM_EMAIL;
        const label = q.kind === 'festival' ? 'Festival hosting request' : 'Premiere request';
        const headline = q.details[0]?.[1] || q.name;
        const rows = [['From', q.name], ['Email', q.email], ...q.details, ...(q.link ? [['Link', q.link]] : [])]
            .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#888;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 0;font-weight:700;">${escapeHtml(v)}</td></tr>`)
            .join('');
        const bodyHtml = `
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">${label}</p>
            <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;">${escapeHtml(headline)}</h1>
            <table style="border-collapse:collapse;font-size:14px;margin-bottom:20px;">${rows}</table>
            ${q.message ? `<div style="background:#f4f4f4;padding:20px;border-radius:8px;color:#1a1a1a;">${escapeHtml(q.message).replace(/\n/g, '<br/>')}</div>` : ''}
            <p style="font-size:12px;color:#999;margin-top:20px;">Hit reply to answer ${escapeHtml(q.name)} directly.</p>`;

        if (process.env.RESEND_API_KEY) {
            const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
                from: `CRATE TV <${FROM_EMAIL}>`,
                to: [studioEmail],
                reply_to: q.email,
                subject: `${q.kind === 'festival' ? '🎪' : '🎬'} ${label}: ${headline.slice(0, 80)}`,
                html: renderBrandedEmail({ title: `${label}: ${escapeHtml(headline.slice(0, 80))}`, bodyHtml }),
            });
            if (error) console.error('[send-inquiry] email failed (copy saved in inquiries):', error);
        }
        return json({ success: true });
    } catch (e) {
        console.error('[send-inquiry]', e);
        return json({ error: 'Something went wrong. Please email studio@cratetv.net instead.' }, 500);
    }
}
