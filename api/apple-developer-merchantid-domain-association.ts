// This is a Vercel Serverless Function
// It will be accessible at the path /api/apple-developer-merchantid-domain-association
// and rewritten from /.well-known/apple-developer-merchantid-domain-association

export async function GET(request: Request) {
  try {
    // This is the content of the verification file you download from your Square Developer Dashboard.
    // It MUST be stored in an environment variable for security and to prevent it from being public in your git repo.
    const verificationFileContent = process.env.APPLE_PAY_VERIFICATION_CONTENT;

    if (!verificationFileContent) {
      console.error("APPLE_PAY_VERIFICATION_CONTENT environment variable is not set.");
      return new Response("Configuration error: Verification content not found.", {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response(verificationFileContent, {
      status: 200,
      headers: { 
        'Content-Type': 'text/plain',
        // Apple Pay verification files should be cached to reduce server load
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate',
       },
    });

  } catch (error) {
    console.error('Error serving Apple Pay verification file:', error);
    return new Response('An internal server error occurred.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}