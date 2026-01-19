
import { getAdminDb, getInitializationError } from '../_lib/firebaseAdmin.js';

/**
 * ROKU AUTH POLL HUB
 * Path: /api/roku/poll-auth
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // The Roku logs show it uses 'device_code_id'
    const deviceId = searchParams.get('device_code_id') || searchParams.get('deviceId') || searchParams.get('deviceCodeId');

    if (!deviceId) {
      return new Response(JSON.stringify({ 
        linked: false, 
        status: "error", 
        error: "Hardware identifier missing in request." 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
    const db = getAdminDb();
    if (!db) throw new Error("Database node unreachable.");

    // Check for a permanent authorization document in the verified links collection
    const linkDoc = await db.collection('roku_links').doc(deviceId).get();

    if (linkDoc.exists) {
      const data = linkDoc.data();
      return new Response(JSON.stringify({
        linked: true,
        status: "success",
        userId: data?.userId,
        token: deviceId // The Hardware ID remains the persistent session token
      }), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
      });
    }

    // Handshake still in 'pending' state
    return new Response(JSON.stringify({
      linked: false,
      status: "pending",
      message: "Awaiting user input on web terminal."
    }), {
      status: 200,
      headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store' 
      },
    });

  } catch (error) {
    console.error("[Auth Pulse Error]:", error);
    return new Response(JSON.stringify({ 
        linked: false, 
        status: "error", 
        error: "Handshake processing deferred." 
    }), { 
        status: 200, // Return 200 so Roku retry logic continues
        headers: { 'Content-Type': 'application/json' } 
    });
  }
}
