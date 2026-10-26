// api/festival-help.ts — the festival "Need help?" button.
//
// Free to run: uses only Firestore and the Resend account already used for
// ticket emails. No AI service.
//
// Actions (POST { action, ... }):
//   check   { idToken, otherEmail? }  → finds the viewer's tickets and RESTORES
//                                       any access they paid for but don't have
//                                       (same expiry rules as the purchase).
//                                       With otherEmail: says whether tickets
//                                       exist under that email on another account.
//   resend  { idToken }               → re-emails the viewer a list of their
//                                       tickets with times and links.
//   report  { idToken?, contactEmail?, category, message, page, userAgent }
//                                     → saves a help request and emails CRATE
//                                       with the viewer's ticket picture attached.
//
// What it never does: grant access without a ticket record, re-open access
// that has ended, touch refunded tickets or rentals, refund anything, or
// change the schedule or the site.

import { Resend } from 'resend';
import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';
import { TicketDiagnosis, maskEmail, sameEmail, HELP_CATEGORIES } from './_lib/festivalHelpRules.js';
import { diagnose, applyRepairs } from './_lib/festivalHelp.js';

const resend = new Resend(process.env.RESEND_API_KEY || 're_missing');
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const SITE = () => process.env.VITE_APP_URL || 'https://cratetv.net';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

class HelpError extends Error { constructor(public status: number, message: string) { super(message); } }

const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function signedInUser(idToken: unknown): Promise<{ uid: string; email: string; matchEmail: string }> {
    if (typeof idToken !== 'string' || !idToken) throw new HelpError(401, 'Please sign in first.');
    const auth = getAdminAuth();
    if (!auth) throw new HelpError(503, 'Service unavailable.');
    try {
        const d = await auth.verifyIdToken(idToken);
        // Tickets bought under an email only count once that email is
        // confirmed: anyone can sign up with someone else's address (Oct 2026).
        return { uid: d.uid, email: String(d.email || '').toLowerCase(), matchEmail: d.email_verified === true ? String(d.email || '').toLowerCase() : '' };
    } catch { throw new HelpError(401, 'Your sign-in expired. Refresh the page and try again.'); }
}

/** Limits that hold across server instances (stored in Firestore). */
async function allow(db: Firestore, key: string, max: number, windowMs: number): Promise<boolean> {
    const ref = db.collection('help_limits').doc(key.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 140));
    return db.runTransaction(async tx => {
        const now = Date.now();
        const hits = (((await tx.get(ref)).data()?.hits || []) as number[]).filter(t => t > now - windowMs);
        if (hits.length >= max) return false;
        tx.set(ref, { hits: [...hits, now] });
        return true;
    });
}

const STATUS_TEXT: Record<string, string> = {
    'ok': 'Working',
    'fixed': 'Fixed just now',
    'ended': 'This ticket’s viewing window has ended',
    'refunded': 'Refunded — Crate TV will check this one',
    'needs-person': 'Crate TV will check this one',
};

function statusOf(r: TicketDiagnosis, fixed: Set<string>): string {
    if (fixed.has(r.ticketId)) return 'fixed';
    if (r.action.kind === 'ok') return 'ok';
    if (r.action.kind === 'ended') return 'ended';
    if (r.action.kind === 'refunded') return 'refunded';
    return 'needs-person';
}

function whenText(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
}

async function adminEmail(db: Firestore): Promise<string> {
    try { return (await db.collection('content').doc('settings').get()).data()?.technicalEmail || 'cratetiv@gmail.com'; }
    catch { return 'cratetiv@gmail.com'; }
}

// ─── Handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        const ip = getIP(request);
        if (!rateLimit(`festival-help:${ip}`, 40, 60_000)) return json({ error: 'Too many requests — try again in a minute.' }, 429);
        const body = await request.json().catch(() => ({}));
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);

        switch (body?.action) {
            case 'check': {
                const who = await signedInUser(body.idToken);
                if (!(await allow(db, `check_${who.uid}`, 15, 60 * 60 * 1000))) throw new HelpError(429, 'You’ve checked a lot in the last hour. Use “Send to Crate TV” below and we’ll look at it.');
                const { mine, results, catalog } = await diagnose(db, who.uid, who.matchEmail);
                const fixed = await applyRepairs(db, who.uid, mine, results);

                let otherAccount: { email: string; tickets: number } | null = null;
                const other = String(body.otherEmail || '').trim().toLowerCase();
                if (other) {
                    if (!EMAIL.test(other)) throw new HelpError(400, 'That email doesn’t look right.');
                    if (!sameEmail(other, who.email)) {
                        if (!(await allow(db, `other_${who.uid}`, 5, 60 * 60 * 1000))) throw new HelpError(429, 'Too many email checks. Use “Send to Crate TV” below and we’ll look at it.');
                        const snap = await db.collection('festival_tickets').where('email', '==', other).get();
                        const elsewhere = snap.docs.filter(d => d.data().uid && d.data().uid !== who.uid);
                        if (elsewhere.length) otherAccount = { email: maskEmail(other), tickets: elsewhere.length };
                    }
                }
                return json({
                    signedInAs: who.email,
                    fixedCount: fixed.size,
                    otherAccount,
                    tickets: results.map(r => {
                        const block = catalog.blocks.get(r.itemId);
                        const status = statusOf(r, fixed);
                        return { label: r.label, status, statusText: STATUS_TEXT[status], startsAt: block?.screeningStartTime || null, link: block?.link || catalog.links.get(r.itemId) || null };
                    }),
                });
            }

            case 'resend': {
                const who = await signedInUser(body.idToken);
                if (!who.email) throw new HelpError(400, 'Your account has no email address.');
                if (!(await allow(db, `resend_${who.uid}`, 3, 24 * 60 * 60 * 1000))) throw new HelpError(429, 'We’ve already re-sent your tickets 3 times today. Check your spam folder, or use “Send to Crate TV”.');
                const { results, catalog } = await diagnose(db, who.uid, who.matchEmail);
                const usable = results.filter(r => r.action.kind !== 'refunded');
                if (!usable.length) return json({ sent: false, message: 'We couldn’t find any tickets on this account.' });
                const rows = usable.map(r => {
                    const block = catalog.blocks.get(r.itemId);
                    const link = block?.link || catalog.links.get(r.itemId);
                    const when = whenText(block?.screeningStartTime);
                    return `<div style="padding:14px 16px;background:rgba(255,255,255,0.04);border-left:3px solid #E50914;margin:0 0 10px;">
                        <p style="margin:0;font-weight:700;color:#fff;">${escapeHtml(r.label)}</p>
                        ${when ? `<p style="margin:4px 0 0;color:#bbb;font-size:13px;">${escapeHtml(when)}</p>` : ''}
                        ${link ? `<p style="margin:6px 0 0;font-size:13px;"><a href="${SITE()}${link}" style="color:#E50914;">${SITE().replace(/^https?:\/\//, '')}${escapeHtml(link)}</a></p>` : ''}
                    </div>`;
                }).join('');
                await resend.emails.send({
                    from: `Crate TV <${fromEmail}>`,
                    to: who.email,
                    subject: 'Your Crate TV festival tickets',
                    html: renderBrandedEmail({
                        title: 'Your Tickets',
                        bodyHtml: `<p style="margin:0 0 16px;font-size:14px;">Here are the tickets on your Crate TV account. Sign in as <strong>${escapeHtml(who.email)}</strong> to watch.</p>${rows}
                            ${renderEmailButton('Open My Festival', `${SITE()}/my-festival`)}`,
                    }),
                });
                return json({ sent: true, to: who.email, count: usable.length });
            }

            case 'report': {
                if (!(await allow(db, `report_${ip}`, 6, 60 * 60 * 1000))) throw new HelpError(429, 'Too many messages from this connection. Please try again in an hour.');
                let who: { uid: string; email: string; matchEmail: string } | null = null;
                if (body.idToken) { try { who = await signedInUser(body.idToken); } catch { who = null; } }
                const contactEmail = String(body.contactEmail || who?.email || '').trim().toLowerCase();
                if (!EMAIL.test(contactEmail)) throw new HelpError(400, 'Add an email address so Crate TV can reply.');
                const message = String(body.message || '').trim().slice(0, 2000);
                const category = HELP_CATEGORIES.includes(body.category) ? body.category : 'other';
                if (!message && category === 'other') throw new HelpError(400, 'Tell us what’s happening.');
                const page = String(body.page || '').slice(0, 300);
                const userAgent = String(body.userAgent || request.headers.get('user-agent') || '').slice(0, 300);

                let tickets: { label: string; status: string }[] = [];
                if (who) {
                    try {
                        const { results } = await diagnose(db, who.uid, who.matchEmail);
                        tickets = results.map(r => ({ label: r.label, status: statusOf(r, new Set()) }));
                    } catch (e) { console.error('[festival-help] diagnose for report failed:', e); }
                }
                const ref = await db.collection('help_requests').add({
                    uid: who?.uid || null, accountEmail: who?.email || null, contactEmail, category, message, page, userAgent,
                    tickets, status: 'open', createdAt: FieldValue.serverTimestamp(),
                });
                const reference = ref.id.slice(0, 6).toUpperCase();
                const ticketList = tickets.length
                    ? tickets.map(t => `<li>${escapeHtml(t.label)} — ${escapeHtml(STATUS_TEXT[t.status] || t.status)}</li>`).join('')
                    : `<li>${who ? 'No tickets on this account' : 'Not signed in'}</li>`;
                try {
                    await resend.emails.send({
                        from: `Crate TV Help <${fromEmail}>`,
                        to: [await adminEmail(db)],
                        reply_to: contactEmail,
                        subject: `🆘 Festival help (${category}) — ${contactEmail} [${reference}]`,
                        html: renderBrandedEmail({
                            title: 'Festival Help Request',
                            bodyHtml: `
                                <p style="margin:0 0 8px;"><strong>From:</strong> ${escapeHtml(contactEmail)}${who && who.email !== contactEmail ? ` (signed in as ${escapeHtml(who.email)})` : ''}${!who ? ' (not signed in)' : ''}</p>
                                <p style="margin:0 0 8px;"><strong>Problem:</strong> ${escapeHtml(category)}</p>
                                <p style="margin:0 0 8px;"><strong>Page:</strong> ${escapeHtml(page)}</p>
                                <p style="margin:0 0 16px;"><strong>Device:</strong> ${escapeHtml(userAgent)}</p>
                                <div style="padding:14px 16px;background:rgba(255,255,255,0.04);border-left:3px solid #f59e0b;margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(message) || '(no message)'}</div>
                                <p style="margin:0 0 6px;"><strong>Their tickets:</strong></p><ul style="margin:0 0 16px;">${ticketList}</ul>
                                <p style="margin:0;font-size:12px;color:#888;">Reply to this email to answer them directly. Reference ${reference}.</p>`,
                        }),
                    });
                } catch (e) { console.error('[festival-help] admin email failed:', e); }
                return json({ sent: true, reference });
            }

            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e) {
        if (e instanceof HelpError) return json({ error: e.message }, e.status);
        console.error('[festival-help] error:', e);
        logServerError('api/festival-help', e);
        return json({ error: 'Something went wrong. Please use “Send to Crate TV” and we’ll sort it out.' }, 500);
    }
}
