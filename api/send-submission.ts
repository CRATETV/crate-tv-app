import { Resend } from 'resend';

// Define the expected shape of the data for type safety
interface SubmissionFormData {
  filmTitle: string;
  directorName: string;
  email: string;
  synopsis: string;
  actorBio?: string;
  awards?: string;
  relevantInfo?: string;
}

// Helper to create a clean HTML body for the email
const createEmailBody = (data: SubmissionFormData): string => {
  const styles = {
    body: 'font-family: Arial, sans-serif; line-height: 1.6; color: #333;',
    container: 'max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #fff;',
    header: 'font-size: 24px; color: #141414; margin-bottom: 20px;',
    label: 'font-weight: bold; color: #555; display: block; margin-top: 15px;',
    content: 'background-color: #f9f9f9; border: 1px solid #eee; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word;',
  };

  // Build optional sections only if data is provided
  const awardsHtml = data.awards ? `<p><span style="${styles.label}">Awards & Recognition:</span><div style="${styles.content}">${data.awards}</div></p>` : '';
  const bioHtml = data.actorBio ? `<p><span style="${styles.label}">Actor Bios:</span><div style="${styles.content}">${data.actorBio}</div></p>` : '';
  const infoHtml = data.relevantInfo ? `<p><span style="${styles.label}">Relevant Information:</span><div style="${styles.content}">${data.relevantInfo}</div></p>` : '';

  // Use a template literal for clean HTML structure
  return `
    <div style="${styles.body}">
      <div style="${styles.container}">
        <h1 style="${styles.header}">New Film Submission for Crate TV</h1>
        <p><span style="${styles.label}">Film Title:</span> ${data.filmTitle}</p>
        <p><span style="${styles.label}">Director's Name:</span> ${data.directorName}</p>
        <p><span style="${styles.label}">Submitter's Email:</span> ${data.email}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p><span style="${styles.label}">Synopsis:</span><div style="${styles.content}">${data.synopsis}</div></p>
        ${bioHtml}
        ${awardsHtml}
        ${infoHtml}
      </div>
    </div>
  `;
};

// Vercel Serverless Function handler
export async function POST(request: Request) {
  try {
    const data: SubmissionFormData = await request.json();

    // Check for required environment variable
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set.");
    }

    // Validate required form fields
    if (!data.filmTitle || !data.directorName || !data.email || !data.synopsis) {
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
      // Vercel build logs consistently require this to be 'reply_to'.
      reply_to: data.email,
      subject: emailSubject,
      html: emailHtml,
    });

    return new Response(JSON.stringify({ message: 'Submission sent successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-submission API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to send submission: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}