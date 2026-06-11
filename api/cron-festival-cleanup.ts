import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

/**
 * FESTIVAL VOD CLEANUP CRON
 * Runs daily at midnight. Hides festival films that have passed their 7-day
 * VOD window (7 days after the watch party ended).
 *
 * Schedule: added to vercel.json crons
 * Trigger: Vercel calls GET /api/cron-festival-cleanup every day at midnight
 */
export async function GET(request: Request) {
  try {
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error('Database offline.');

    const VOD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();

    let hiddenFilms: string[] = [];

    for (const dayDoc of daysSnap.docs) {
      const day = dayDoc.data();
      const blocks = day.blocks || [];

      for (const block of blocks) {
        if (!block.festivalEndTime) continue;

        const endTime = new Date(block.festivalEndTime).getTime();
        const vodExpiry = endTime + VOD_WINDOW_MS;

        if (now > vodExpiry) {
          // VOD window has passed — hide all films in this block
          const movieKeys: string[] = block.movieKeys || [];
          if (movieKeys.length === 0) continue;

          const updates: Record<string, any> = {};
          for (const key of movieKeys) {
            updates[`${key}.isUnlisted`] = true;
          }

          await db.collection('data').doc('movies').update(updates);
          hiddenFilms = [...hiddenFilms, ...movieKeys];

          console.log(`[Festival Cleanup] Block "${block.title || block.id}" VOD window expired. Hidden ${movieKeys.length} films.`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      hiddenFilms,
      message: hiddenFilms.length > 0
        ? `Hidden ${hiddenFilms.length} films whose VOD window has expired.`
        : 'No films to hide today.'
    }), { status: 200 });

  } catch (error) {
    console.error('[Festival Cleanup] Cron error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
