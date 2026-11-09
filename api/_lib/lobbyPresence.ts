// api/_lib/lobbyPresence.ts
//
// Who is REALLY in the lobby right now?
//
// A viewer's lobby doc is written when they open the watch-party page and was
// only deleted when the page closed cleanly. A locked phone, a dropped signal
// or a crashed browser never ran that clean-up, so the "in lobby" number kept
// ghosts forever. Viewers now check in every 30 seconds (lastSeen); anyone not
// seen for 3 minutes no longer counts. (It was 90 seconds at first, which was
// too quick: a person who switched apps or locked their phone briefly vanished
// from the count. Coming back to the page checks in again straight away.)

export const LOBBY_HEARTBEAT_MS = 30_000;
export const LOBBY_STALE_MS = 180_000;

const toMs = (v: any): number | null => {
    if (v == null) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (v instanceof Date) return v.getTime();
    return null;
};

/**
 * True when this lobby doc belongs to someone still here.
 *  • lastSeen within 3 minutes → here
 *  • a just-written doc whose server time hasn't landed yet (null) → here
 *  • an older doc from before heartbeats existed (no lastSeen field) → counted, as before
 */
export function isLobbyViewerActive(data: { lastSeen?: unknown } | null | undefined, nowMs: number): boolean {
    if (!data || !('lastSeen' in data)) return true;
    const seen = toMs((data as any).lastSeen);
    if (seen == null) return true;
    return nowMs - seen <= LOBBY_STALE_MS;
}

/**
 * How far this phone's clock is from the server's, taken from our OWN check-in
 * (the server stamped it a moment ago). Without this, a phone whose clock runs
 * a few minutes fast would see everybody as a ghost, itself included.
 * Capped at +/-10 minutes so a bad reading can't do damage.
 */
export function clockSkewMs(ownLastSeen: unknown, localNowMs: number): number {
    const seen = toMs(ownLastSeen);
    if (seen == null) return 0;
    return Math.max(-600_000, Math.min(600_000, seen - localNowMs));
}
