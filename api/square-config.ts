// This is a Vercel Serverless Function
// It will be accessible at the path /api/square-config
// It provides the necessary public keys for the Square Web Payments SDK to the client.

export async function GET(request: Request) {
  try {
    const applicationId = process.env.SQUARE_APPLICATION_ID;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!applicationId || !locationId) {
      console.error('Square environment variables (SQUARE_APPLICATION_ID or SQUARE_LOCATION_ID) are not set.');
      return new Response(JSON.stringify({ error: 'Payment gateway is not configured correctly.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ applicationId, locationId }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error fetching Square config:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}