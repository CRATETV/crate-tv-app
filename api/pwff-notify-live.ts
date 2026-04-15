import { Resend } from 'resend';
import { getAdminDb } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { festivalName, festivalUrl } = await request.json();

        const db = getAdminDb();
        if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 500 });

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
        const url = festivalUrl || 'https://cratetv.net/pwff2026';

        let sent = 0;
        let errors = 0;

        // Send in batches of 50 to respect rate limits
        for (let i = 0; i < entries.length; i += 50) {
            const batch = entries.slice(i, i + 50);
            await Promise.all(batch.map(async (entry) => {
                try {
                    const greeting = entry.name ? `Hi ${entry.name},` : 'Hi there,';
                    await resend.emails.send({
                        from: 'Crate TV <hello@cratetv.net>',
                        to: entry.email,
                        subject: `🎬 ${name} is now streaming`,
                        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">
        
        <!-- Red top bar -->
        <tr><td height="5" style="background:#E50914;font-size:0;line-height:0;">&nbsp;</td></tr>
        
        <!-- Header -->
        <tr><td style="padding:40px 40px 0;text-align:center;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#E50914;">Playhouse West-Philadelphia × Crate TV</p>
          <h1 style="margin:0;font-size:32px;font-weight:900;color:#ffffff;line-height:1.1;">The festival<br>is live.</h1>
        </td></tr>
        
        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 20px;font-size:15px;color:#aaaaaa;line-height:1.7;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:15px;color:#aaaaaa;line-height:1.7;">
            You signed up to be notified when the <strong style="color:#ffffff;">${name}</strong> went live on Crate TV. That moment is now.
          </p>
          <p style="margin:0 0 32px;font-size:15px;color:#aaaaaa;line-height:1.7;">
            Every block is streaming live as it screens in Philadelphia. Ticket holders get full access — individual blocks and all-access passes are available at the link below.
          </p>
          
          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="${url}" style="display:inline-block;background:#E50914;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:16px 40px;border-radius:4px;">
              Watch Now →
            </a>
          </td></tr></table>
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:11px;color:#444444;">
            You're receiving this because you signed up for festival updates at cratetv.net.<br>
            <a href="https://cratetv.net" style="color:#666666;text-decoration:none;">cratetv.net</a>
          </p>
        </td></tr>
        
        <!-- Red bottom bar -->
        <tr><td height="5" style="background:#E50914;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
