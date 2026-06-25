
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { movieKey, password } = await request.json();

    const primaryAdminPassword = process.env.ADMIN_PASSWORD;
    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    let isAuthenticated = false;
    if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
      isAuthenticated = true;
    } else {
        const db = getAdminDb();
        if (db) {
            const collabSnap = await db.collection('collaborator_access').where('accessKey', '==', password).limit(1).get();
            if (!collabSnap.empty) isAuthenticated = true;
        }
    }

    if (!isAuthenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (!movieKey) {
        return new Response(JSON.stringify({ error: 'Movie identification required.' }), { status: 400 });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error("Database offline.");

    const partyRef = db.collection('watch_parties').doc(movieKey);
    
    await partyRef.update({
      status: 'ended',
      isPlaying: false,
      actualStartTime: null,
      currentTime: 0,
      lastUpdated: FieldValue.serverTimestamp(),
      backstageKey: null
    });

    // Also clear watchPartyStartTime from the movie so the notification never reappears
    await db.collection('movies').doc(movieKey).update({
      watchPartyStartTime: null,
      isWatchPartyEnabled: false
    }).catch(() => {}); // Silently ignore if movie doc doesn't exist

    // Also clear from data/movies real-time document
    await db.collection('data').doc('movies').update({
      [`${movieKey}.watchPartyStartTime`]: null,
      [`${movieKey}.isWatchPartyEnabled`]: false
    }).catch(() => {});

    // Release films to catalog + stamp festivalEndTime for 7-day cleanup cron
    try {
      const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
      let blockMovieKeys: string[] = [];
      let releaseAfterScreening = false; // opt-in — default is NOT to release
      for (const dayDoc of daysSnap.docs) {
        const day = dayDoc.data();
        const blocks = day.blocks || [];
        const matched = blocks.find((b: any) => b.id === movieKey);
        if (matched) {
          blockMovieKeys = matched.movieKeys || [];
          releaseAfterScreening = !!matched.releaseAfterScreening;
          // Stamp festivalEndTime so cron can auto-hide after 7 days
          const idx = blocks.findIndex((b: any) => b.id === movieKey);
          if (idx >= 0) {
            blocks[idx] = { ...blocks[idx], festivalEndTime: new Date().toISOString() };
            await dayDoc.ref.update({ blocks });
          }
          break;
        }
      }
      if (releaseAfterScreening && blockMovieKeys.length > 0) {
        const updates: Record<string, any> = {};
        for (const key of blockMovieKeys) updates[`${key}.isUnlisted`] = false;
        await db.collection('data').doc('movies').update(updates);
        console.log(`[Festival] Released ${blockMovieKeys.length} films to catalog`);
      }
    } catch (e) { console.error('[Festival] Catalog release error:', e); }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Watch Party Termination Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
