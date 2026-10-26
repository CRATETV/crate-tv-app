// This is a Vercel Serverless Function
// Path: /api/check-roku-link-status
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveMovieAccess } from './_lib/entitlements.js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // The Roku sends its device id as ?deviceId= or as "Authorization: Bearer <id>".
    const deviceId = searchParams.get('deviceId') || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim() || null;

    if (!deviceId) {
      return new Response(JSON.stringify({ error: 'Device ID is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    const linkDoc = await db!.collection('roku_links').doc(deviceId).get();

    // The Roku's watch party screen also asks "may this TV watch this party?"
    // (movieKey + its device id as the token). It used to get no answer, so
    // ticket holders always saw "buy a ticket" on the TV (Oct 2026).
    const movieKey = searchParams.get('movieKey');
    if (movieKey && linkDoc.exists) {
      const { granted } = await resolveMovieAccess(db!, { deviceId, movieKey, mode: 'live' });
      return new Response(JSON.stringify({ linked: true, hasAccess: granted, unlockedWatchParty: granted }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    return new Response(JSON.stringify({ linked: linkDoc.exists }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Ensure this check is always live
      },
    });

  } catch (error) {
    console.error("Error checking Roku link status:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}