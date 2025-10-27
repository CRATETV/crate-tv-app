// This is a Vercel Serverless Function
// It will be accessible at the path /api/data-config
// It provides the public URL for the live data file.
export async function POST(request: Request) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    let region = process.env.AWS_S3_REGION;

    if (!bucketName || !region) {
      console.warn('Server is not configured with AWS S3 bucket/region. Client will use fallback data.');
      return new Response(JSON.stringify({ liveDataUrl: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // FIX: Correct the AWS region if it's incorrectly set to 'global'.
    if (region === 'global') {
        region = 'us-east-1';
    }
    
    const liveDataUrl = `https://${bucketName}.s3.${region}.amazonaws.com/live-data.json`;

    return new Response(JSON.stringify({ liveDataUrl }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });

  } catch (error) {
    console.error('Error fetching data config:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
