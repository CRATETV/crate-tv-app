// api/_lib/lobbyPresence.ts
//
// Who is REALLY in the lobby right now?
//
// A viewer's lobby doc is written when they open the watch-party page and was
// only deleted when the page closed cleanly. A locked phone, a dropped signal
// or a crashed browser never ran that clean-up, so the "in lobby" number kept
// ghosts forever. Viewers now check in every 30 seconds (lastSeen); anyone not
// seen for 90 seconds no longer counts.

export const LOBBY_HEARTBEAT_MS = 30_000;
export const LOBBY_STALE_MS = 90_000;

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
 *  • lastSeen within 90s → here
 *  • a just-written doc whose server time hasn't landed yet (null) → here
 *  • an older doc from before heartbeats existed (no lastSeen field) → counted, as before
 */
export function isLobbyViewerActive(data: { lastSeen?: unknown } | null | undefined, nowMs: number): boolean {
    if (!data || !('lastSeen' in data)) return true;
    const seen = toMs((data as any).lastSeen);
    if (seen == null) return true;
    return nowMs - seen <= LOBBY_STALE_MS;
}
