import { Resend } from 'resend';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { isValidAdminKey } from './_lib/adminAuth.js';
import { renderBrandedEmail, renderEmailButton } from './_lib/emailBranding.js';
import { resolveAdminCredential } from './_lib/adminSession.js';

export async function POST(request: Request) {
    try {
        const { festivalName, festivalUrl, bannerImageUrl, password: __raw_password } = await request.json();
        const password = await resolveAdminCredential(__raw_password);

        const db = getAdminDb();
        if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 500 });

        // SECURITY: this emails the entire PWFF interest list. It had no auth
        // at all, and the link + banner image come from the request body — so
        // anyone could blast a phishing email to your audience from Crate's
        // own address. Admin key required, and links must point at Crate.
        if (!(await isValidAdminKey(password, db))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        const isCrateUrl = (u: unknown) => typeof u === 'string' && /^https:\/\/(www\.)?cratetv\.net(\/|$)/i.test(u);
        const isSafeImage = (u: unknown) => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u);
        if (festivalUrl && !isCrateUrl(festivalUrl)) {
            return new Response(JSON.stringify({ error: 'Festival link must be a cratetv.net URL.' }), { status: 400 });
        }
        if (bannerImageUrl && !isSafeImage(bannerImageUrl)) {
            return new Response(JSON.stringify({ error: 'Banner image must be an https:// link.' }), { status: 400 });
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) return new Response(JSON.stringify({ error: 'No email key' }), { status: 500 });

        const resend = new Resend(resendApiKey);

        // Fetch all interest list emails
        const snap = await db.collection('pwff_interest').get();
        const entries: { email: string; name?: string }[] = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.email) entries.push({ email: data.email, name: data.name || '' });
        });

        if (entries.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: 'No emails to send' }), { status: 200 });
        }

        const name = festivalName || 'Playhouse West Film Festival 2026';
        const url = festivalUrl || 'https://cratetv.net/pwff-philly2026';

        let sent = 0;
        let errors = 0;

        // Send in batches of 50 to respect rate limits
        for (let i = 0; i < entries.length; i += 50) {
            const batch = entries.slice(i, i + 50);
            await Promise.all(batch.map(async (entry) => {
                try {
                    const greeting = entry.name ? `Hi ${entry.name},` : 'Hi there,';
                    const bodyHtml = `
                        <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Playhouse West-Philadelphia × Crate TV</p>
                        <h1 style="margin:0 0 24px;font-size:28px;font-weight:900;color:#1a1a1a;line-height:1.15;text-transform:uppercase;letter-spacing:-0.5px;">The festival is live.</h1>
                        ${bannerImageUrl ? `<img src="${bannerImageUrl}" alt="${name}" style="width:100%;max-width:480px;height:auto;border-radius:8px;display:block;margin:0 0 28px;" />` : ''}
                        <p style="margin:0 0 20px;">${greeting}</p>
                        <p style="margin:0 0 20px;">You signed up to be notified when the <strong>${name}</strong> went live on Crate TV. That moment is now.</p>
                        <p style="margin:0 0 32px;">Every block is streaming live as it screens in Philadelphia. Ticket holders get full access — individual blocks and all-access passes are available at the link below.</p>
                        ${renderEmailButton('Watch Now →', url)}
                        <p style="margin:32px 0 0;font-size:12px;color:#999999;">You're receiving this because you signed up for festival updates at cratetv.net.</p>
                    `;
                    await resend.emails.send({
                        from: 'Crate TV <hello@cratetv.net>',
                        to: entry.email,
                        subject: `🎬 ${name} is now streaming`,
                        html: renderBrandedEmail({
                            title: `${name} is now streaming`,
                            bodyHtml,
                            footerTagline: 'Playhouse West Film Festival — Philadelphia',
                        }),
                    });
                    sent++;
                } catch {
                    errors++;
                }
            }));
            // Small delay between batches
            if (i + 50 < entries.length) await new Promise(r => setTimeout(r, 500));
        }

        return new Response(JSON.stringify({ sent, errors, total: entries.length }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
