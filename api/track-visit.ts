
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit, getIP } from './_lib/rateLimit.js';

export async function POST(request: Request) {
  try {
    if (!rateLimit(`track-visit:${getIP(request)}`, 30, 10 * 60_000)) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
    const initError = getInitializationError();
    if (initError) throw new Error(`Database connection failed: ${initError}`);
    
    const db = getAdminDb();
    if (!db) {
      throw new Error("Database connection is not available.");
    }
    
    const country = request.headers.get('x-vercel-ip-country') || 'unknown';
    const referrer = request.headers.get('referer') || 'direct';
    const timestamp = FieldValue.serverTimestamp();
    
    const batch = db.batch();

    // 1. General Visit Event Log
    const eventRef = db.collection('traffic_events').doc();
    batch.set(eventRef, {
        country,
        referrer,
        platform: 'WEB',
        timestamp,
        type: 'VISIT'
    });
    
    await batch.commit();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking visit:", error);
    return new Response(JSON.stringify({ success: true, warning: "Visit tracking deferred." }), { status: 200 });
  }
}
