// api/notify-payout-threshold-cron.ts
//
// Runs on a schedule (see vercel.json) and emails a filmmaker the first
// time their available balance crosses the $5 payout minimum. Fires once
// per crossing — a filmmaker_payout_notifications doc (keyed by normalized
// director/producer name) tracks the balance last notified at, so staying
// above $5 doesn't re-email every run, but getting paid out and crossing
// again later does. The in-dashboard banner (FilmmakerDashboardView.tsx)
// is intentionally separate and needs none of this — it just reflects the
// live balance on every visit.
//
// Configure in vercel.json:
//   { "path": "/api/notify-payout-threshold-cron", "schedule": "0 */2 * * *" }

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { computeAllFilmmakerBalances } from './_lib/filmmakerBalance.js';
import { normalize } from './_lib/creditMatch.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'studio@cratetv.net';
const MINIMUM_PAYOUT_CENTS = 500; // $5.00 — keep in sync with api/request-payout.ts

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// Firestore doc IDs can't contain "/" — normalized names are otherwise safe.
const sanitizeDocId = (id: string) => id.replace(/\//g, '_');

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        const [balances, filmmakerUsersSnapshot] = await Promise.all([
            computeAllFilmmakerBalances(db),
            db.collection('users').where('isFilmmaker', '==', true).get(),
        ]);

        const emailByNormalizedName = new Map<string, string>();
        filmmakerUsersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name && data.email) emailByNormalizedName.set(normalize(data.name), data.email);
        });

        const crossedThreshold = Array.from(balances.entries()).filter(([, b]) => b.balance >= MINIMUM_PAYOUT_CENTS);

        let notified = 0;
        let skippedNoAccount = 0;

        await Promise.allSettled(crossedThreshold.map(async ([normalizedName, summary]) => {
            const docRef = db.collection('filmmaker_payout_notifications').doc(sanitizeDocId(normalizedName));
            const existing = await docRef.get();
            const lastNotifiedBalance = existing.exists ? (existing.data()?.lastNotifiedBalance || 0) : 0;

            if (lastNotifiedBalance >= MINIMUM_PAYOUT_CENTS) return; // already notified for this crossing

            const email = emailByNormalizedName.get(normalizedName);
            if (!email) {
                // No verified filmmaker account matches this credited name yet —
                // skip WITHOUT writing the doc, so a later verification (via
                // /filmmaker-signup) lets the next run pick them up and notify.
                skippedNoAccount++;
                return;
            }

            const dashboardUrl = `${process.env.VITE_APP_URL || 'https://cratetv.net'}/filmmaker-dashboard`;
            const bodyHtml = `
                <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#22c55e;">Payout Available</p>
                <h1 style="margin:0 0 24px;font-size:26px;font-weight:900;color:#1a1a1a;text-transform:uppercase;line-height:1.1;">You've crossed ${formatCurrency(MINIMUM_PAYOUT_CENTS)}</h1>
                <p style="margin:0 0 24px;font-size:14px;">Your Crate TV balance is now <strong>${formatCurrency(summary.balance)}</strong> — you can request your disbursement from the Filmmaker Dashboard.</p>
                ${renderEmailButton('Go to Filmmaker Dashboard', dashboardUrl)}
            `;

            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: email,
                subject: `You've crossed ${formatCurrency(MINIMUM_PAYOUT_CENTS)} — request your Crate TV payout`,
                html: renderBrandedEmail({ title: "You've crossed the payout minimum", bodyHtml }),
            });

            await docRef.set({
                directorName: summary.directorName,
                directorNameNormalized: normalizedName,
                lastNotifiedBalance: summary.balance,
                lastNotifiedAt: FieldValue.serverTimestamp(),
            });

            notified++;
        }));

        return new Response(JSON.stringify({ ok: true, notified, skippedNoAccount, eligible: crossedThreshold.length }), { status: 200 });

    } catch (error) {
        console.error('[notify-payout-threshold-cron] Failed:', error);
        return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), { status: 500 });
    }
}
