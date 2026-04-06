// api/add-to-catalog.ts
// Called when admin clicks "Add to Catalog" in the Pipeline tab.
// Updates Firestore status to "catalog" and emails filmmaker letting them know.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { addPipelineEntryToCatalog } from './_lib/addToCatalog.js';

export async function POST(request: Request) {
    try {
        const { submissionId, password } = await request.json();

        // Auth check
        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;

        if (password && (password === primaryAdminPassword || password === masterPassword)) {
            isAuthenticated = true;
        } else if (password) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        const anyPasswordSet = process.env.ADMIN_PASSWORD || process.env.ADMIN_MASTER_PASSWORD;
        if (!anyPasswordSet) isAuthenticated = true;

        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!submissionId) {
            return new Response(JSON.stringify({ error: 'submissionId is required' }), {
                status: 400, headers: { 'Content-Type': 'application/json' },
            });
        }

        const initError = getInitializationError();
        if (initError) {
            return new Response(JSON.stringify({ error: initError }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        const db = getAdminDb();
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database unavailable' }), {
                status: 500, headers: { 'Content-Type': 'application/json' },
            });
        }

        const docRef = db.collection('movie_pipeline').doc(submissionId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return new Response(JSON.stringify({ error: 'Submission not found' }), {
                status: 404, headers: { 'Content-Type': 'application/json' },
            });
        }

        const data = docSnap.data()!;
        const { title, director, email } = data;

        // Update Firestore status to catalog
        await docRef.update({
            status: 'catalog',
            isApproved: true,
            isReviewed: true,
            reviewedAt: FieldValue.serverTimestamp(),
        });

        // Auto-add to movies catalog as a free title + trigger publish
        let movieKey = '';
        try {
            const result = await addPipelineEntryToCatalog(db, data, submissionId, false);
            movieKey = result.movieKey;
            console.log(`✅ Movie "${data.title}" added to free catalog as "${movieKey}"`);
        } catch (catalogErr) {
            console.warn('Failed to auto-add to catalog (non-fatal):', catalogErr);
        }

        // Send filmmaker notification
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey || !email) {
            return new Response(JSON.stringify({ success: true, emailSent: false }), {
                status: 200, headers: { 'Content-Type': 'application/json' },
            });
        }

        const resend = new Resend(resendApiKey);

        await resend.emails.send({
            from: 'CrateTV <studio@cratetv.net>',
            to: email,
            subject: `Your film "${title}" has been added to CrateTV`,
            html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0f0f0" style="background:#f0f0f0;">
<tr><td style="padding:28px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr>
    <td bgcolor="#E50914" style="background:#E50914;padding:13px 28px;border-radius:10px 10px 0 0;">
      <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:800;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">CRATETV</p>
    </td>
  </tr>
  <tr>
    <td bgcolor="#f8f8f8" style="background:#f8f8f8;padding:28px 24px;text-align:center;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        ${data.posterUrl ? `<td style="padding:0 20px 0 0;vertical-align:middle;"><img src="${data.posterUrl}" alt="${title}" width="120" style="width:120px;height:180px;object-fit:cover;border-radius:8px;display:block;border:1px solid #e0e0e0;" /></td>` : ''}
        <td style="vertical-align:middle;"><img src="https://cratetv.net/api/generate-laurel-svg?award=Official+Selection&year=${new Date().getFullYear()}&color=gold" alt="CrateTV Official Selection Laurel" width="160" height="160" style="display:block;" /></td>
      </tr></table>
    </td>
  </tr>
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
      <p style="margin:0 0 10px;color:#E50914;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">CrateTV &mdash; Official Selection</p>
      <h1 style="margin:0 0 16px;color:#111111;font-size:24px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-0.5px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Welcome to CRATE, ${director}.</h1>
      <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.8;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">We've reviewed <strong style="color:#111111;">"${title}"</strong> and we'd love to welcome it into the CRATE general catalog &mdash; available to our full audience on CrateTV.</p>
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">While your film wasn't selected for our Premium tier this season, being part of the CRATE catalog puts your work in front of our growing global audience.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
        <td bgcolor="#f0fdf4" style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center;">
          <p style="margin:0 0 4px;color:#14532d;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">What this means for you</p>
          <p style="margin:4px 0;color:#166534;font-size:13px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">&#127758; Available to CrateTV's full audience including Roku</p>
          <p style="margin:4px 0;color:#166534;font-size:13px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">&#127916; Non-exclusive &mdash; you keep full ownership</p>
          <p style="margin:4px 0 0;color:#166534;font-size:13px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">&#128140; Always welcome to resubmit for Premium consideration</p>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
        <td bgcolor="#fffbeb" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:20px;text-align:center;">
          <p style="margin:0 0 6px;color:#92400e;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Your Official Selection Laurel</p>
          <p style="margin:0 0 16px;color:#78350f;font-size:13px;line-height:1.6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Download and use on your posters, trailers, and social media. Transparent &mdash; layers on anything.</p>
          <a href="https://cratetv.net/api/generate-laurel-svg?award=Official+Selection&year=${new Date().getFullYear()}&color=gold" style="display:inline-block;background:#d97706;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Download Laurel (SVG)</a>
          <p style="margin:12px 0 0;color:#92400e;font-size:11px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Also: <a href="https://cratetv.net/api/generate-laurel-svg?award=Official+Selection&year=${new Date().getFullYear()}&color=white" style="color:#92400e;font-weight:700;">White</a> &middot; <a href="https://cratetv.net/api/generate-laurel-svg?award=Official+Selection&year=${new Date().getFullYear()}&color=silver" style="color:#92400e;font-weight:700;">Silver</a></p>
        </td>
      </tr></table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
        <td bgcolor="#E50914" style="background:#E50914;border-radius:8px;">
          <a href="https://cratetv.net" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">VISIT CRATETV</a>
        </td>
      </tr></table>
      <p style="margin:28px 0 0;color:#9ca3af;font-size:11px;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Questions? <a href="mailto:studio@cratetv.net" style="color:#6b7280;text-decoration:none;">studio@cratetv.net</a></p>
    </td>
  </tr>
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:0 32px 20px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;border-radius:0 0 10px 10px;">
      <p style="margin:0;color:#d1d5db;font-size:10px;text-align:center;border-top:1px solid #f3f4f6;padding-top:16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">&copy; ${new Date().getFullYear()} CRATE TV &middot; All rights reserved.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`,
        });

        console.log(`✅ Catalog email sent to ${email} for "${title}"`);

        return new Response(JSON.stringify({ success: true, emailSent: true }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('add-to-catalog error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
}
