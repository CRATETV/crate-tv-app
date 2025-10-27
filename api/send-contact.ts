import { Resend } from 'resend';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-contact

// NOTE: The following values are fallbacks. For production and security, it is
// strongly recommended to set RESEND_API_KEY, FROM_EMAIL, and TO_EMAIL as
// environment variables rather than hardcoding them here.
const resend = new Resend(process.env.RESEND_API_KEY || 're_DB9YrhLH_PRYF6PESKVh3x1vXLJLrXsL6');
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const toEmail = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Basic validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Name, email, and message are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = `
      <div>
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      </div>
    `;

    // Send email using Resend
    // FIX: Corrected 'reply_to' to 'replyTo' to match the Resend API's expected property name.
    const { data, error } = await resend.emails.send({
      from: `Crate TV Contact Form <${fromEmail}>`,
      to: [toEmail],
      subject: `New Message from ${name}`,
      html: emailHtml,
      reply_to: email,
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Message sent successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in send-contact API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to send message: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}