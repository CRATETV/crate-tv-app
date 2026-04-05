// api/approve-film-submission.ts
// Called when admin clicks "Approve" in the Pipeline tab.
// Updates Firestore status and sends approval email to filmmaker via Resend.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { addPipelineEntryToCatalog } from './_lib/addToCatalog.js';

export async function POST(request: Request) {
    try {
        const { submissionId, password } = await request.json();

        // Auth check — same pattern as rest of admin API
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
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!submissionId) {
            return new Response(JSON.stringify({ error: 'submissionId is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const initError = getInitializationError();
        if (initError) {
            return new Response(JSON.stringify({ error: initError }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const db = getAdminDb();
        if (!db) {
            return new Response(JSON.stringify({ error: 'Database unavailable' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the submission doc
        const docRef = db.collection('movie_pipeline').doc(submissionId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return new Response(JSON.stringify({ error: 'Submission not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const data = docSnap.data()!;
        const { title, director, email } = data;

        // Update Firestore status
        await docRef.update({
            status: 'approved',
            isApproved: true,
            isReviewed: true,
            reviewedAt: FieldValue.serverTimestamp(),
        });

        // Auto-add to movies catalog as a $4.99 premium title + trigger publish
        let movieKey = '';
        try {
            const result = await addPipelineEntryToCatalog(db, data, submissionId, true);
            movieKey = result.movieKey;
            console.log(`✅ Movie "${data.title}" added to catalog as "${movieKey}"`);
        } catch (catalogErr) {
            console.warn('Failed to auto-add to catalog (non-fatal):', catalogErr);
        }

        // Send approval email via Resend
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            console.warn('RESEND_API_KEY not set — skipping approval email');
            return new Response(JSON.stringify({ success: true, emailSent: false }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!email) {
            console.warn(`Submission ${submissionId} has no email — skipping approval email`);
            return new Response(JSON.stringify({ success: true, emailSent: false }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const resend = new Resend(resendApiKey);

        await resend.emails.send({
            from: 'CrateTV <studio@cratetv.net>',
            to: email,
            subject: `🎬 "${title}" has been approved for CrateTV`,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#000;">
    <tr>
      <td style="padding:40px 20px;">
        <table role="presentation" style="max-width:560px;margin:0 auto;border-collapse:collapse;">

          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#0d0d0d 100%);border-radius:16px;overflow:hidden;border:1px solid #333;">

              ${data.posterUrl ? `
              <div style="text-align:center;padding:24px;background:linear-gradient(180deg,rgba(229,9,20,0.25) 0%,transparent 100%);">
                <img src="${data.posterUrl}" alt="${title}" style="max-width:160px;height:auto;border-radius:10px;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
              </div>` : ''}

              <div style="padding:32px;">
                <p style="margin:0 0 8px;color:#E50914;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;text-align:center;">
                  CrateTV — Film Selection
                </p>
                <h1 style="margin:0 0 8px;color:#fff;font-size:26px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;">
                  Congratulations, ${director}.
                </h1>
                <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.8;text-align:center;">
                  We're thrilled to let you know that your film
                  <strong style="color:#fff;">"${title}"</strong>
                  has been approved and will be included in the CrateTV catalog.
                </p>
                <p style="margin:0 0 32px;color:#9ca3af;font-size:14px;line-height:1.8;text-align:center;">
                  Your film is now part of the CRATE community. Welcome to the catalog.
                </p>
                <div style="text-align:center;">
                  <a href="https://cratetv.net"
                     style="display:inline-block;background:#E50914;color:#fff;text-decoration:none;
                            padding:14px 36px;border-radius:8px;font-weight:800;font-size:12px;
                            letter-spacing:2px;text-transform:uppercase;">
                    VISIT CRATETV →
                  </a>
                </div>
                <p style="margin:32px 0 0;color:#374151;font-size:11px;text-align:center;">
                  Questions? Reply to this email or reach us at
                  <a href="mailto:studio@cratetv.net" style="color:#6b7280;">studio@cratetv.net</a>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:10px;color:#374151;">
                © ${new Date().getFullYear()} CRATE TV · All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
        });

        console.log(`✅ Approval email sent to ${email} for "${title}"`);

        return new Response(JSON.stringify({ success: true, emailSent: true, movieKey }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('approve-film-submission error:', error);
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
