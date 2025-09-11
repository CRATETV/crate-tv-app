// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-contact
import { Resend } from 'resend';

const createEmailBody = (data: { name: string; email: string; message: string; }): string => {
  // Basic styles for a clean email layout
  const styles = {
    body: 'font-family: Arial, sans-serif; line-height: 1.6; color: #333;',
    container: 'max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;',
    header: 'font-size: 24px; color: #141414; margin-bottom: 20px;',
    label: 'font-weight: bold; color: #555;',
    message: 'background-color: #f9f9f9; border: 1px solid #eee; padding: 15px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;',
  };

  return `
    <div style="${styles.body}">
      <div style="${styles.container}">
        <h1 style="${styles.header}">New Message from Crate TV Contact Form</h1>
        <p><span style="${styles.label}">From:</span> ${data.name}</p>
        <p><span style="${styles.label}">Email:</span> ${data.email}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="${styles.label}">Message:</p>
        <div style="${styles.message}">${data.message}</div>
      </div>
    </div>
  `;
};

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY environment variable is not set. Email cannot be sent.");
    }

    // Basic validation
    if (!data.name || !data.email || !data.message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name, email, and message are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = createEmailBody(data);
    const emailSubject = `New Contact Message from ${data.name}`;
    const recipientEmail = "cratetiv@gmail.com";
    
    const resend = new Resend(process.env.RESEND_API_KEY);

    // FIX: Changed 'reply_to' to 'replyTo' to match the Resend SDK's type definition.
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      replyTo: data.email,
      subject: emailSubject,
      html: emailHtml,
    });

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