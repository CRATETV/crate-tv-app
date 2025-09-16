// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-submission
import { Resend } from 'resend';

// Helper function to create the HTML email body
const createEmailBody = (data: Record<string, string>): string => {
  const styles = {
    body: 'background-color: #f4f4f4; margin: 0; padding: 0; font-family: Arial, sans-serif;',
    container: 'max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 8px; overflow: hidden;',
    header: 'background-color: #141414; color: #ffffff; padding: 20px; text-align: center;',
    headerH1: 'margin: 0; font-size: 24px;',
    content: 'padding: 30px;',
    section: 'margin-bottom: 20px;',
    sectionH2: 'font-size: 18px; color: #333333; border-bottom: 2px solid #eeeeee; padding-bottom: 10px; margin-top: 0;',
    label: 'font-weight: bold; color: #555555;',
    text: 'color: #333333; line-height: 1.6;',
    pre: 'background-color: #f9f9f9; border: 1px solid #dddddd; padding: 15px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; font-family: monospace;',
    footer: 'background-color: #f4f4f4; color: #888888; text-align: center; padding: 20px; font-size: 12px;',
  };

  const fields = [
    { key: 'filmTitle', label: 'Film Title' },
    { key: 'directorName', label: "Director's Name" },
    { key: 'email', label: 'Email Address' },
    { key: 'synopsis', label: 'Synopsis' },
    { key: 'actorBio', label: 'Actor Bios' },
    { key: 'awards', label: 'Awards & Recognition' },
    { key: 'relevantInfo', label: 'Relevant Information' },
  ];

  let contentHtml = '';
  for (const field of fields) {
    if (data[field.key]) {
      contentHtml += `
        <div style="${styles.section}">
          <h2 style="${styles.sectionH2}">${field.label}</h2>
          <pre style="${styles.pre}">${data[field.key]}</pre>
        </div>
      `;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>New Film Submission</title>
    </head>
    <body style="${styles.body}">
      <div style="${styles.container}">
        <div style="${styles.header}">
          <h1 style="${styles.headerH1}">New Film Submission from Crate TV</h1>
        </div>
        <div style="${styles.content}">
          ${contentHtml}
        </div>
        <div style="${styles.footer}">
          <p>This is an automated notification from the Crate TV website.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};


export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY environment variable is not set. Email cannot be sent.");
    }

    // Basic validation
    if (!data.filmTitle || !data.directorName || !data.email) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = createEmailBody(data);
    const emailSubject = `New Film Submission: "${data.filmTitle}"`;
    const recipientEmail = "cratetiv@gmail.com";
    
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Crate TV Submissions <noreply@cratetv.net>',
      to: recipientEmail,
      // FIX: Changed 'reply_to' to 'replyTo' to match the expected property name in CreateEmailOptions.
      replyTo: data.email,
      subject: emailSubject,
      html: emailHtml,
    });

    return new Response(JSON.stringify({ message: 'Submission received successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-submission API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to process submission: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}