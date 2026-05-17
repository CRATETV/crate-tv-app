// This API endpoint provides the public-facing configuration needed for the Square Web Payments SDK.
// It securely reads credentials from environment variables on the server.
export async function GET(request: Request) {
  try {
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

    // Try production keys first if in production, otherwise try sandbox
    let applicationId = isProduction 
      ? (process.env.SQUARE_APPLICATION_ID || process.env.SQUARE_SANDBOX_APPLICATION_ID)
      : (process.env.SQUARE_SANDBOX_APPLICATION_ID || process.env.SQUARE_APPLICATION_ID);
    
    let locationId = isProduction
      ? (process.env.SQUARE_LOCATION_ID || process.env.SQUARE_SANDBOX_LOCATION_ID)
      : (process.env.SQUARE_SANDBOX_LOCATION_ID || process.env.SQUARE_LOCATION_ID);

    if (!applicationId || !locationId) {
      console.error('Square configuration missing:', {
        hasAppId: !!applicationId,
        hasLocationId: !!locationId,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV
      });
      return new Response(JSON.stringify({ 
        error: 'Payment system is not configured. Please contact support.',
        code: 'CONFIG_MISSING'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ applicationId, locationId }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    console.error('Square config error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}