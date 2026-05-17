
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey } = await request.json();
    if (!movieKey) {
      return new Response(JSON.stringify({ error: "movieKey is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Identify the user from the auth token
    let userEmail: string | null = null;
    let uid: string | null = null;
    try {
        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split('Bearer ')[1];
            const adminAuth = getAdminAuth();
            if (adminAuth) {
                const decoded = await adminAuth.verifyIdToken(token);
                uid = decoded.uid;
                userEmail = decoded.email || null;
            }
        }
    } catch {}

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

    // 1. Static Aggregate Counter
    const viewDocRef = db.collection('view_counts').doc(movieKey);
    batch.set(viewDocRef, { 
      count: FieldValue.increment(1),
      lastViewed: timestamp
    }, { merge: true });

    // 2. Location Aggregate
    const locationDocRef = db.collection('view_locations').doc(movieKey);
    batch.set(locationDocRef, {
        [country]: FieldValue.increment(1)
    }, { merge: true });

    // 3. New: Time-Series Event Log (for Spike Detection)
    const eventRef = db.collection('traffic_events').doc();
    batch.set(eventRef, {
        movieKey,
        country,
        referrer,
        platform: 'WEB',
        timestamp,
        type: 'VIEW'
    });
    
    await batch.commit();

    // If this viewer is on the pwff_invites list, log that they watched
    if (userEmail && uid) {
        try {
            const inviteRef = db.collection('pwff_invites').doc(userEmail.toLowerCase().trim());
            const invite = await inviteRef.get();
            if (invite.exists) {
                const watched = invite.data()?.watchedMovies || [];
                if (!watched.includes(movieKey)) {
                    await inviteRef.update({
                        watchedMovies: [...watched, movieKey],
                        lastWatchedAt: new Date().toISOString(),
                        status: 'watched',
                    });
                }
            }
        } catch {}
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error tracking view:", error);
    return new Response(JSON.stringify({ success: true, warning: "View tracking deferred." }), { status: 200 });
  }
}
