// This is a Vercel Serverless Function
// Path: /api/email-film-report
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const adminEmail = 'cratetiv@gmail.com';

const formatCurrency = (amountInCents: number) => `$${(amountInCents / 100).toFixed(2)}`;
const formatNumber = (num: number) => num.toLocaleString();

export async function POST(request: Request) {
  try {
    const { password, filmData } = await request.json();

    // --- Authentication ---
    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    }
    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }
    
    // --- Firestore Logic ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // --- Find Filmmaker's Email ---
    const usersQuery = db.collection('users').where('name', '==', filmData.director).where('isFilmmaker', '==', true).limit(1);
    const userSnapshot = await usersQuery.get();

    if (userSnapshot.empty) {
        throw new Error(`Could not find a registered filmmaker account for "${filmData.director}". Ensure they have signed up for the filmmaker portal.`);
    }
    const filmmakerEmail = userSnapshot.docs[0].data().email;

    // --- Build HTML Email ---
    const emailHtml = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #e5e7eb; background-color: #111827; padding: 20px; border-radius: 8px;">
        <h1 style="color: #fca5a5;">Performance Report for "${filmData.title}"</h1>
        <p>Hello ${filmData.director},</p>
        <p>Here is the latest performance report for your film on Crate TV. Thank you for being a part of our community!</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="border-bottom: 1px solid #374151;">
                <td style="padding: 8px; color: #9ca3af;">Total Views</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">${formatNumber(filmData.views)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #374151;">
                <td style="padding: 8px; color: #9ca3af;">Total Likes</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">${formatNumber(filmData.likes)}</td>
            </tr>
        </table>
        <h2 style="color: #c4b5fd; margin-top: 30px;">Financial Breakdown</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #374151;">
                <td style="padding: 8px; color: #9ca3af;">Total Donations Received</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(filmData.donations)}</td>
            </tr>
             <tr style="border-bottom: 1px solid #374151;">
                <td style="padding: 8px; color: #9ca3af;">Your Payout (70%)</td>
                <td style="padding: 8px; text-align: right; color: #86efac;">${formatCurrency(filmData.filmmakerDonationPayout)}</td>
            </tr>
             <tr style="border-bottom: 1px solid #374151;">
                <td style="padding: 8px; color: #9ca3af;">Total Ad Revenue Generated</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(filmData.adRevenue)}</td>
            </tr>
             <tr style="border-bottom: 1px solid #374151;">
                <td style="padding: 8px; color: #9ca3af;">Your Payout (50%)</td>
                <td style="padding: 8px; text-align: right; color: #86efac;">${formatCurrency(filmData.filmmakerAdPayout)}</td>
            </tr>
            <tr style="border-top: 2px solid #4b5563; margin-top: 10px;">
                <td style="padding: 8px; font-weight: bold;">Total Payout Earned</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #86efac;">${formatCurrency(filmData.totalFilmmakerPayout)}</td>
            </tr>
        </table>
        <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">You can request a payout from your Filmmaker Dashboard once your balance exceeds $1.00.</p>
        <p style="font-size: 12px; color: #6b7280;">- The Crate TV Team</p>
      </div>
    `;

    // --- Send Email ---
    await resend.emails.send({
        from: `Crate TV Reports <${fromEmail}>`,
        to: filmmakerEmail,
        bcc: adminEmail, // Send a copy to admin for records
        subject: `Your Crate TV Performance Report for "${filmData.title}"`,
        html: emailHtml,
    });

    return new Response(JSON.stringify({ success: true, message: `Report sent to ${filmmakerEmail}.` }), {
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error emailing film report:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
