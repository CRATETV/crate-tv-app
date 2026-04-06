// api/cron-monthly-spotlight.ts
// Vercel Cron Job — runs every Monday at 9am ET
// Only sends on the FIRST Monday of the month
// Configure in vercel.json: { "crons": [{ "path": "/api/cron-monthly-spotlight", "schedule": "0 14 * * 1" }] }

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

export async function GET(request: Request) {
    // Verify it's actually the first Monday of the month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const dayOfWeek  = now.getDay(); // 0=Sun, 1=Mon

    // First Monday = day is Mon AND date is 1–7
    if (dayOfWeek !== 1 || dayOfMonth > 7) {
        return new Response(JSON.stringify({ skipped: true, reason: 'Not first Monday of month' }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
        });
    }

    // Verify cron secret so only Vercel can trigger this
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const initError = getInitializationError();
    if (initError) {
        console.error('Firebase init error:', initError);
        return new Response(JSON.stringify({ error: initError }), { status: 500 });
    }

    const db = getAdminDb();
    if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 500 });

    // Read spotlight config set by admin
    const spotlightDoc = await db.collection('settings').doc('monthly_spotlight').get();
    if (!spotlightDoc.exists) {
        console.warn('No monthly spotlight configured — skipping');
        return new Response(JSON.stringify({ skipped: true, reason: 'No spotlight configured' }), { status: 200 });
    }

    const { movieKey, sentAt } = spotlightDoc.data()!;

    // Don't send twice in same month
    if (sentAt) {
        const sent = sentAt.toDate ? sentAt.toDate() : new Date(sentAt);
        if (sent.getMonth() === now.getMonth() && sent.getFullYear() === now.getFullYear()) {
            return new Response(JSON.stringify({ skipped: true, reason: 'Already sent this month' }), { status: 200 });
        }
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ skipped: true, reason: 'No movie key set' }), { status: 200 });
    }

    // Fetch the movie
    const movieDoc = await db.collection('movies').doc(movieKey).get();
    if (!movieDoc.exists) {
        return new Response(JSON.stringify({ error: `Movie ${movieKey} not found` }), { status: 404 });
    }
    const movie = movieDoc.data()!;

    // Collect all subscribers from both collections
    const [subSnap, zineSnap] = await Promise.all([
        db.collection('subscriptions').get(),
        db.collection('zine_subscriptions').get(),
    ]);
    const emailSet = new Set<string>();
    subSnap.docs.forEach(d  => emailSet.add(d.id));
    zineSnap.docs.forEach(d => emailSet.add(d.id));
    const emails = Array.from(emailSet).filter(e => e.includes('@'));

    if (emails.length === 0) {
        return new Response(JSON.stringify({ skipped: true, reason: 'No subscribers' }), { status: 200 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const filmUrl = `https://cratetv.net/movie/${movieKey}`;
    const poster  = movie.poster || movie.tvPoster || '';
    const synopsis = (movie.synopsis || '').replace(/<[^>]+>/g, '').substring(0, 220);

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0f0f0">
<tr><td style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

  <!-- Red header -->
  <tr>
    <td bgcolor="#E50914" style="background:#E50914;padding:13px 28px;border-radius:10px 10px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">CRATETV</p></td>
          <td style="text-align:right;"><p style="margin:0;color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${monthName} ${year}</p></td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Poster -->
  ${poster ? `
  <tr>
    <td bgcolor="#111111" style="background:#111111;padding:0;text-align:center;">
      <img src="${poster}" alt="${movie.title}" width="560" style="width:100%;max-width:560px;height:260px;object-fit:cover;display:block;" />
    </td>
  </tr>` : ''}

  <!-- Body -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
      <p style="margin:0 0 8px;color:#E50914;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Monthly Spotlight &mdash; ${monthName}</p>
      <h1 style="margin:0 0 8px;color:#111111;font-size:26px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${movie.title}</h1>
      ${movie.director ? `<p style="margin:0 0 20px;color:#E50914;font-size:11px;font-weight:700;text-align:center;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Directed by ${movie.director}</p>` : ''}

      ${synopsis ? `<p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8;text-align:center;font-style:italic;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">"${synopsis}${(movie.synopsis || '').length > 220 ? '…' : ''}"</p>` : ''}

      <!-- Watch button -->
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
        <tr>
          <td bgcolor="#E50914" style="background:#E50914;border-radius:8px;">
            <a href="${filmUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Watch Now &rarr;</a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
        You're receiving this because you subscribed to CrateTV updates.<br/>
        <a href="https://cratetv.net" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:0 32px 20px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;border-radius:0 0 10px 10px;">
      <p style="margin:0;color:#d1d5db;font-size:10px;text-align:center;border-top:1px solid #f3f4f6;padding-top:16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">&copy; ${year} CRATE TV &middot; All rights reserved.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    // Send in batches of 40 (Resend limit)
    const BATCH = 40;
    let sent = 0;
    for (let i = 0; i < emails.length; i += BATCH) {
        const batch = emails.slice(i, i + BATCH);
        await resend.emails.send({
            from: 'CrateTV <studio@cratetv.net>',
            to: 'delivered@resend.dev',
            bcc: batch,
            subject: `🎬 ${monthName} Spotlight: "${movie.title}" is now streaming`,
            html,
        });
        sent += batch.length;
    }

    // Mark as sent
    await db.collection('settings').doc('monthly_spotlight').update({
        sentAt: new Date(),
        lastSentTo: sent,
    });

    console.log(`✅ Monthly spotlight sent: "${movie.title}" to ${sent} subscribers`);
    return new Response(JSON.stringify({ success: true, movie: movie.title, sentTo: sent }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
    });
}
