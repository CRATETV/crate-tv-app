import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function GET(request: Request) {
  try {
    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    const db = getAdminDb();
    if (!db) throw new Error('Database offline.');

    const VOD_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
    let hiddenFilms: string[] = [];

    for (const dayDoc of daysSnap.docs) {
      for (const block of (dayDoc.data().blocks || [])) {
        if (!block.festivalEndTime) continue;
        if (now > new Date(block.festivalEndTime).getTime() + VOD_WINDOW_MS) {
          const keys: string[] = block.movieKeys || [];
          if (!keys.length) continue;
          const updates: Record<string, any> = {};
          for (const k of keys) updates[`${k}.isUnlisted`] = true;
          await db.collection('data').doc('movies').update(updates);
          hiddenFilms = [...hiddenFilms, ...keys];
          console.log(`[Cleanup] Hidden ${keys.length} films from block "${block.title || block.id}"`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, hiddenFilms }), { status: 200 });
  } catch (error) {
    console.error('[Festival Cleanup]', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
