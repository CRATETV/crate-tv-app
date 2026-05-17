import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Resend } from 'resend';

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

    await resend.emails.send({
        from: `Crate TV Reports <${FROM_EMAIL}>`,
        to: [filmmakerEmail],
        subject: `📊 Performance Report: ${filmData.title}`,
        html: `<h1>Report for ${filmData.title}</h1><p>Total Views: ${filmData.views}</p><p>Earnings: $${(filmData.totalFilmmakerPayout / 100).toFixed(2)}</p>`,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Email report error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}