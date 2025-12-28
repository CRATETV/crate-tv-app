import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const ADMIN_EMAIL = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'User email is required.' }), { status: 400 });
    }

    const { error } = await resend.emails.send({
        from: `Crate TV Alerts <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject: `🎉 New Sign-Up: ${email}`,
        html: `<div><h1>New User</h1><p>The user <strong>${email}</strong> has registered.</p></div>`,
    });

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Sign-up notify error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
  }
}