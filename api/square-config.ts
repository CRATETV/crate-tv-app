// This API endpoint provides the public-facing configuration needed for the Square Web Payments SDK.
// It securely reads credentials from environment variables on the server.
export async function GET(request: Request) {
  try {
    const config = {
      applicationId: process.env.SQUARE_APPLICATION_ID,
      locationId: process.env.SQUARE_LOCATION_ID,
    };

    if (!config.applicationId || !config.locationId) {
      console.error("Square Application ID or Location ID is not configured on the server.");
      throw new Error("Square payments are not configured on the server.");
    }

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        // Cache the public config to reduce redundant requests
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}