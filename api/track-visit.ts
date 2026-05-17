
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
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
