// This API endpoint provides the public-facing configuration needed for the Square Web Payments SDK.
// It securely reads credentials from environment variables on the server.
export async function GET(request: Request) {
  try {
    console.log('--- [API /square-config] Diagnostic Start ---');
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
    const isProduction = process.env.VERCEL_ENV === 'production';
    console.log(`Mode Detected: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);

    const config = {
      applicationId: isProduction 
        ? process.env.SQUARE_APPLICATION_ID 
        : process.env.SQUARE_SANDBOX_APPLICATION_ID,
      locationId: isProduction 
        ? process.env.SQUARE_LOCATION_ID 
        : process.env.SQUARE_SANDBOX_LOCATION_ID,
    };

    console.log('Serving Config:', {
        applicationId: config.applicationId ? `...${config.applicationId.slice(-4)}` : 'NOT FOUND',
        locationId: config.locationId ? `...${config.locationId.slice(-4)}` : 'NOT FOUND',
    });
    console.log('--- [API /square-config] Diagnostic End ---');

    if (!config.applicationId || !config.locationId) {
      const missingVar = isProduction ? 'Production' : 'Sandbox';
      console.error(`Square ${missingVar} Application ID or Location ID is not configured on the server.`);
      throw new Error(`Square payments are not configured on the server for the current environment.`);
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