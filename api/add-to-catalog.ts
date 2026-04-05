// api/add-to-catalog.ts
// Called when admin clicks "Add to Catalog" in the Pipeline tab.
// Updates Firestore status to "catalog" and emails filmmaker letting them know.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { Resend } from 'resend';

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
              <div style="text-align:center;padding:24px;background:linear-gradient(180deg,rgba(229,9,20,0.15) 0%,transparent 100%);">
                <img src="${data.posterUrl}" alt="${title}" style="max-width:140px;height:auto;border-radius:10px;box-shadow:0 20px 40px rgba(0,0,0,0.8);">
              </div>` : ''}

              <div style="padding:32px;">
                <p style="margin:0 0 8px;color:#E50914;font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;text-align:center;">
                  CrateTV — Official Selection
                </p>
                <h1 style="margin:0 0 16px;color:#fff;font-size:24px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:-1px;">
                  Welcome to CRATE, ${director}.
                </h1>

                <p style="margin:0 0 16px;color:#9ca3af;font-size:14px;line-height:1.8;text-align:center;">
                  We've reviewed <strong style="color:#fff;">"${title}"</strong> and we'd love to welcome it into the <strong style="color:#fff;">CRATE general catalog</strong> — available to our full audience on CrateTV.
                </p>

                <p style="margin:0 0 28px;color:#9ca3af;font-size:14px;line-height:1.8;text-align:center;">
                  While your film wasn't selected for our Premium tier this season, being part of the CRATE catalog puts your work in front of our growing global audience. Your film is now part of the community.
                </p>

                <!-- What this means box -->
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:28px;">
                  <p style="margin:0 0 12px;color:#fff;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">What this means for you</p>
                  <table role="presentation" style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:6px 0;color:#9ca3af;font-size:13px;">🌍</td>
                      <td style="padding:6px 0 6px 10px;color:#9ca3af;font-size:13px;line-height:1.6;">Your film is available to CrateTV's full audience, including our Roku channel</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#9ca3af;font-size:13px;">🎬</td>
                      <td style="padding:6px 0 6px 10px;color:#9ca3af;font-size:13px;line-height:1.6;">Non-exclusive — you keep full ownership and can screen elsewhere</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;color:#9ca3af;font-size:13px;">📩</td>
                      <td style="padding:6px 0 6px 10px;color:#9ca3af;font-size:13px;line-height:1.6;">You're always welcome to resubmit future projects for Premium consideration</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align:center;">
                  <a href="https://cratetv.net"
                     style="display:inline-block;background:#E50914;color:#fff;text-decoration:none;
                            padding:14px 36px;border-radius:8px;font-weight:800;font-size:12px;
                            letter-spacing:2px;text-transform:uppercase;">
                    VISIT CRATETV →
                  </a>
                </div>

                <p style="margin:28px 0 0;color:#374151;font-size:11px;text-align:center;">
                  Questions? Reach us at <a href="mailto:studio@cratetv.net" style="color:#6b7280;">studio@cratetv.net</a>
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
