import { Resend } from 'resend';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-contact

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'contact@cratetv.net';
const toEmail = process.env.TO_EMAIL || 'info@cratetv.net';

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

    // Ensure environment variables are set
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured on the server.");
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