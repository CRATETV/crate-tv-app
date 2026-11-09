// The monthly spotlight email. Used by the Monday cron and by the admin preview.
import { LOGO_URL_ON_DARK } from './emailBranding.js';

const esc = (t: unknown) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildSpotlightEmail(movieKey: string, movie: any, now: Date): { subject: string; html: string } {
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

  <!-- Dark header with logo -->
  <tr>
    <td bgcolor="#0a0a0a" style="background:#0a0a0a;padding:20px 28px;border-radius:10px 10px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td><img src="${LOGO_URL_ON_DARK}" alt="Crate TV" width="110" style="display:block;border:0;" /></td>
          <td style="text-align:right;"><p style="margin:0;color:rgba(255,255,255,0.7);font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${monthName} ${year}</p></td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Poster -->
  ${poster ? `
  <tr>
    <td bgcolor="#111111" style="background:#111111;padding:0;text-align:center;">
      <img src="${poster}" alt="${esc(movie.title)}" width="560" style="width:100%;max-width:560px;height:260px;object-fit:cover;display:block;" />
    </td>
  </tr>` : ''}

  <!-- Body -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
      <p style="margin:0 0 8px;color:#E50914;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Monthly Spotlight &mdash; ${monthName}</p>
      <h1 style="margin:0 0 8px;color:#111111;font-size:26px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${esc(movie.title)}</h1>
      ${movie.director ? `<p style="margin:0 0 20px;color:#E50914;font-size:11px;font-weight:700;text-align:center;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Directed by ${esc(movie.director)}</p>` : ''}

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
        <a href="https://cratetv.net/unsubscribe" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
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
    return { subject: `🎬 ${monthName} Spotlight: "${movie.title}" is now streaming`, html };
}

/**
 * The film's details. Films live in two places (a document each in `movies`, and
 * one big map in `data/movies`); use whichever has the film so the email can't fail
 * just because one copy is missing.
 */
export async function loadSpotlightMovie(db: any, movieKey: string): Promise<any | null> {
    const single = await db.collection('movies').doc(movieKey).get();
    if (single.exists && single.data()?.title) return single.data();
    const all = await db.collection('data').doc('movies').get();
    const fromMap = all.exists ? all.data()?.[movieKey] : null;
    return fromMap || (single.exists ? single.data() : null);
}
