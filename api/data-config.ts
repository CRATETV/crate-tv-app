// This is a Vercel Serverless Function
// It will be accessible at the path /api/data-config
// It provides the public URL for the live data file.
export async function GET(request: Request) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_S3_REGION;

    if (!bucketName || !region) {
      console.error('Server is not configured with AWS S3 bucket/region for live data.');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
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