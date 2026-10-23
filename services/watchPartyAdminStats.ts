// Viewership numbers for the Watch Party Manager (admin panel).
//
// These used to be added up in the browser by reading every viewer's
// `watchSessions` record straight from the database. The admin panel signs in
// with the admin password, not a regular CRATE account, so the database
// refused that read ("Missing or insufficient permissions"). The numbers now
// come from /api/admin-watch-party-stats, which adds them up on the server
// (api/_lib/watchPartyStats.ts, the same code as the post-party report email).

export interface BlockViewershipStats {
  uniqueViewers: number;
  totalWatchMinutes: number;
  averageWatchMinutes: number;
  peakConcurrentViewers: number; // highest simultaneous count over the party's whole run, not just now
  peakDeviceSplit: { mobile: number; desktop: number };
  sessionsUnder2Min: number; // quick bounces — people who clicked but barely watched
  watchingNow: number; // live count — heartbeat within the last 45 seconds
}

export async function getBlockViewershipStats(blockId: string): Promise<BlockViewershipStats> {
  let password = '';
  try { password = sessionStorage.getItem('adminPassword') || ''; } catch { /* no storage */ }
  if (!password) throw new Error('Sign in to the admin panel again to see viewer numbers.');

  const res = await fetch('/api/admin-watch-party-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockId, password }),
  });
  if (res.status === 401) throw new Error('Your admin sign-in expired. Sign in again to see viewer numbers.');
  if (!res.ok) throw new Error('The server could not add up the viewer numbers. Try again in a minute.');
  return res.json();
}
