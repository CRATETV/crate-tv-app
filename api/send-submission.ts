import { Resend } from 'resend';

// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-submission

// NOTE: The following values are fallbacks. For production and security, it is
// strongly recommended to set RESEND_API_KEY, FROM_EMAIL, and TO_EMAIL as
// environment variables rather than hardcoding them here.
const resend = new Resend(process.env.RESEND_API_KEY || 're_DB9YrhLH_PRYF6PESKVh3x1vXLJLrXsL6');
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';
const toEmail = 'cratetiv@gmail.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        filmTitle, 
        directorName, 
        email, 
        synopsis,
        actorBio,
        awards,
        relevantInfo
    } = body;

    // Basic validation
    if (!filmTitle || !directorName || !email || !synopsis) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailHtml = `
        <div>
            <h2>New Film Submission: "${filmTitle}"</h2>
            <p><strong>Director:</strong> ${directorName}</p>
            <p><strong>Submitter Email:</strong> ${email}</p>
            <hr>
            <h3>Synopsis:</h3>
            <p>${synopsis.replace(/\n/g, '<br>')}</p>
            
            ${actorBio ? `<h3>Actor Bios:</h3><p>${actorBio.replace(/\n/g, '<br>')}</p>` : ''}
            ${awards ? `<h3>Awards & Recognition:</h3><p>${awards.replace(/\n/g, '<br>')}</p>` : ''}
            ${relevantInfo ? `<h3>Relevant Information:</h3><p>${relevantInfo.replace(/\n/g, '<br>')}</p>` : ''}

            <hr>
            <p>The submitter has been instructed to upload their film files via the Dropbox link.</p>
        </div>
    `;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
        from: `Crate TV Submissions <${fromEmail}>`,
        to: [toEmail],
        subject: `New Film Submission: ${filmTitle}`,
        html: emailHtml,
        // FIX: Corrected the 'reply_to' property to 'replyTo' in the Resend API call to match the expected type definition.
        replyTo: email,
    });

    if (error) {
        console.error('Resend error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

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