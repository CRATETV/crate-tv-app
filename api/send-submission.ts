// This is a Vercel Serverless Function
// It will be accessible at the path /api/send-submission
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filmTitle, directorName, email, synopsis } = body;

    // Basic validation
    if (!filmTitle || !directorName || !email || !synopsis) {
      return new Response(JSON.stringify({ error: 'Missing required fields.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // In a real application, you would add logic here to:
    // 1. Sanitize the input data.
    // 2. Send an email notification using a service like SendGrid, Resend, or Nodemailer.
    //    e.g., await sendEmail({ to: 'admin@cratetv.net', subject: `New Film Submission: ${filmTitle}`, ... });
    // 3. Save the submission details to a database.
    
    console.log('Received new film submission:', body);

    // Simulate a successful operation
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
