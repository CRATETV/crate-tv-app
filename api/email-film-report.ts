import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';
import { renderBrandedEmail } from './_lib/emailBranding.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';

export async function POST(request: Request) {
  try {
    const { password, filmData } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const db = getAdminDb();
    if (!db) throw new Error("DB fail");

    const userSnapshot = await db.collection('users').where('name', '==', filmData.director).where('isFilmmaker', '==', true).limit(1).get();

    if (userSnapshot.empty) throw new Error("Filmmaker not found");
    const filmmakerEmail = userSnapshot.docs[0].data().email;

    const bodyHtml = `
        <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">Performance Report</p>
        <h1 style="margin:0 0 28px;font-size:26px;font-weight:900;text-transform:uppercase;">${filmData.title}</h1>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <tr>
                <td style="padding:20px;background-color:#f4f4f4;border-radius:12px 0 0 12px;text-align:center;width:50%;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#666666;">Total Views</p>
                    <p style="margin:0;font-size:28px;font-weight:900;color:#1a1a1a;">${filmData.views}</p>
                </td>
                <td style="padding:20px;background-color:#f4f4f4;border-radius:0 12px 12px 0;text-align:center;width:50%;border-left:1px solid #e5e5e5;">
                    <p style="margin:0 0 6px;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#666666;">Earnings</p>
                    <p style="margin:0;font-size:28px;font-weight:900;color:#ef4444;">$${(filmData.totalFilmmakerPayout / 100).toFixed(2)}</p>
                </td>
            </tr>
        </table>
    `;

    await resend.emails.send({
        from: `Crate TV Reports <${FROM_EMAIL}>`,
        to: [filmmakerEmail],
        subject: `📊 Performance Report: ${filmData.title}`,
        html: renderBrandedEmail({ title: `Performance Report: ${filmData.title}`, bodyHtml }),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Email report error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}