// Query + aggregation logic for the watch party admin dashboard. Call
// getBlockViewershipStats(blockId) from WatchPartyManager (or wherever the
// dashboard lives) and render the returned object however fits the UI.

import { getDbInstance } from './firebaseClient';

// A session counts as "watching right now" only if its most recent
// heartbeat landed within this window. useWatchHeartbeat sends one every
// 20s (and only while the video is actually playing and the tab is
// visible — see its own comments), so 2x that plus a little slack covers
// one missed beat from a slow connection without letting someone who
// paused/left minutes ago still read as "watching."
const LIVE_WINDOW_MS = 45000;

export interface BlockViewershipStats {
  uniqueViewers: number;
  totalWatchMinutes: number;
  averageWatchMinutes: number;
  peakDeviceSplit: { mobile: number; desktop: number };
  sessionsUnder2Min: number; // quick bounces — people who clicked but barely watched
  watchingNow: number; // live count — heartbeat within the last LIVE_WINDOW_MS
}

export async function getBlockViewershipStats(blockId: string): Promise<BlockViewershipStats> {
  const db = getDbInstance();
  if (!db) {
    throw new Error('Firestore is not initialized. Cannot get viewership stats.');
  }

  const snapshot = await db.collection('watchSessions').where('blockId', '==', blockId).get();

  const seenUsers = new Set<string>();
  let totalSeconds = 0;
  let mobileCount = 0;
  let desktopCount = 0;
  let bounces = 0;
  let watchingNow = 0;
  const now = Date.now();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    seenUsers.add(data.userId);
    totalSeconds += data.watchSeconds || 0;

    if (data.device === 'mobile') mobileCount++;
    else desktopCount++;

    if ((data.watchSeconds || 0) < 120) bounces++;

    const lastHeartbeatMs = data.lastHeartbeat?.toMillis?.();
    if (lastHeartbeatMs && !data.endedAt && now - lastHeartbeatMs < LIVE_WINDOW_MS) {
      watchingNow++;
    }
  });

  const uniqueViewers = seenUsers.size;
  const totalWatchMinutes = Math.round(totalSeconds / 60);
  const averageWatchMinutes = uniqueViewers > 0 ? Math.round(totalWatchMinutes / uniqueViewers) : 0;

  return {
    uniqueViewers,
    totalWatchMinutes,
    averageWatchMinutes,
    peakDeviceSplit: { mobile: mobileCount, desktop: desktopCount },
    sessionsUnder2Min: bounces,
    watchingNow,
  };
}

// Example: render this in the admin panel as a card per block:
//
// const stats = await getBlockViewershipStats(block.id);
// <div>
//   <p>{stats.uniqueViewers} unique viewers</p>
//   <p>{stats.averageWatchMinutes} min avg watch time</p>
//   <p>{stats.sessionsUnder2Min} quick bounces (under 2 min)</p>
//   <p>{stats.peakDeviceSplit.mobile} mobile / {stats.peakDeviceSplit.desktop} desktop</p>
// </div>
