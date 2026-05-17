// This is a Vercel Serverless Function
// It will be accessible at the path /api/firebase-config
export async function POST(request: Request) {
  try {
    // These are public keys, safe to expose to the client.
    const config = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };

    // Validate that the essential keys are present on the server
    if (!config.apiKey || !config.projectId) {
      console.error("Firebase server environment variables are not set.");
      return new Response(JSON.stringify({ error: "Firebase configuration is missing on the server." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache config for 1 hour
      },
    });

  } catch (error) {
    console.error('Error in firebase-config API:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred while fetching Firebase config.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}