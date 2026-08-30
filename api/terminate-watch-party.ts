
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logServerError } from './_lib/logError.js';
import { assembleAndSyncMasterData } from './publish-data.js';
import { sendWatchPartyReport } from './_lib/sendWatchPartyReport.js';

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

    // FIX (user report — the watch party banner stayed up even after
    // ending the party): the homepage banner's highest-priority check
    // (see the "PRIORITY 0" comment in contexts/FestivalContext.tsx) reads
    // from this SEPARATE watch_party_schedule doc, not from watch_parties
    // directly. It's written once when a party time is first set
    // (api/schedule-watch-party.ts) but was never being cleared here —
    // so it just sat there with isWatchPartyEnabled: true forever, and
    // the banner had no way to know the party was actually over.
    await db.collection('watch_party_schedule').doc(movieKey).update({
      isWatchPartyEnabled: false
    }).catch(() => {}); // fine if this doc doesn't exist for this party

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
      let blockTitle = '';
      let releaseAfterScreening = false; // opt-in — default is NOT to release
      for (const dayDoc of daysSnap.docs) {
        const day = dayDoc.data();
        const blocks = day.blocks || [];
        const matched = blocks.find((b: any) => b.id === movieKey);
        if (matched) {
          blockMovieKeys = matched.movieKeys || [];
          blockTitle = matched.title || '';
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

      // Post-party engagement report to any verified filmmaker credited on
      // this block's films — unrelated to releaseAfterScreening, so it
      // fires for every ended party regardless of catalog-release settings.
      sendWatchPartyReport(db, movieKey, blockTitle, blockMovieKeys)
        .catch(e => console.error('[Festival] Watch party report email failed:', e));
      if (releaseAfterScreening && blockMovieKeys.length > 0) {
        // FIX: writing to data/movies here had zero real effect — the
        // client-side listener for that document explicitly only copies a
        // fixed set of unrelated watch-party fields, never isUnlisted. The
        // real movies collection (used elsewhere in this same file, above)
        // is what actually controls catalog visibility.
        await Promise.all(blockMovieKeys.map(key =>
          db.collection('movies').doc(key).update({ isUnlisted: false }).catch(() => {})
        ));
        console.log(`[Festival] Released ${blockMovieKeys.length} films to catalog`);

        // FIX (user report — "Time to Leave" stayed off the live catalog
        // after its block ended, even though isUnlisted was correctly set
        // to false above): the live site never reads Firestore directly —
        // it's served from a manifest snapshot on S3, which only changes
        // when something explicitly republishes it (normally an admin
        // Save in the dashboard, via /api/publish-data). Nothing in this
        // release flow was doing that, so a correct Firestore write could
        // sit invisible on the live site indefinitely. Republishing here
        // makes the release actually reach real viewers.
        try { await assembleAndSyncMasterData(db); }
        catch (e) { console.error('[Festival] Post-release republish failed:', e); }
      }
    } catch (e) { console.error('[Festival] Catalog release error:', e); }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Watch Party Termination Error:", error);
    logServerError('api/terminate-watch-party', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
