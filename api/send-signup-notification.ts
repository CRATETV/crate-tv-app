import { Resend } from 'resend';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-signup-notification

const resend = new Resend(process.env.RESEND_API_KEY || 're_DB9YrhLH_PRYF6PESKVh3x1vXLJLrXsL6');
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const toEmail = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email of new user is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subject = `🎉 New Crate TV Sign-Up: ${email}`;
    const emailHtml = `
      <div>
        <h1>New User Sign-Up</h1>
        <p>A new user has just signed up for Crate TV with the following email address:</p>
        <p><strong>${email}</strong></p>
        <p>Welcome them to the community!</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
        from: `Crate TV Notifications <${fromEmail}>`,
        to: [toEmail],
        subject: subject,
        html: emailHtml,
    });

    if (error) {
        console.error('Resend error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ message: 'Notification sent successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-signup-notification API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to send notification: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}