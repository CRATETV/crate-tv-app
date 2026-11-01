// api/_lib/controlRoom.ts
//
// The extra live panels in Admin → Watch Party Control Room (Oct 2026):
//   - tickets sold for this party and the money it made
//   - viewers who stopped watching recently (to spot playback trouble)
//   - a pinned announcement shown at the top of everyone's chat
//
// The decisions are pure (no database) so they're tested:
// tests/controlRoom.test.ts.

/** A viewer is "watching" while their player checked in this recently. */
export const LIVE_WINDOW_MS = 45_000;
/** How far back the "stopped watching" list looks. */
export const DROPPED_WINDOW_MS = 15 * 60_000;
/** A pinned announcement older than this isn't shown (stops last week's pin reappearing at the next party). */
export const PIN_MAX_AGE_MS = 12 * 60 * 60_000;
export const PIN_MAX_LENGTH = 200;

export interface TicketRecord {
    amountPaid?: unknown;
    paymentType?: unknown;
    email?: unknown;
    promoCode?: unknown;
    purchasedAtMs?: number | null;
}

export interface MoneySplit {
    /** Square's card fees on the tickets Square has reported, in dollars. */
    squareFees: number;
    /** Paid tickets whose fee Square has not reported yet (usually the last day or so). */
    feesPending: number;
    /** The filmmaker's share as a fraction, 0 to 1. */
    filmmakerShare: number;
    filmmakerAmount: number;
    crateKeeps: number;
}

/**
 * Where the money goes. The filmmaker's share is taken from what buyers paid (that is how
 * CRATE counts every film's earnings), so Square's card fees come out of CRATE's part.
 * Pure, tested.
 */
export function splitSales(revenue: number, fees: { amount: number; fee: number | null }[], filmmakerShare: number): MoneySplit {
    let squareFees = 0, feesPending = 0;
    for (const f of fees) {
        if (!(f.amount > 0)) continue;                       // free seats pay no fee
        if (f.fee === null) feesPending++; else squareFees += f.fee;
    }
    const share = Math.min(1, Math.max(0, Number.isFinite(filmmakerShare) ? filmmakerShare : 0.7));
    const filmmakerAmount = money(revenue * share);
    return { squareFees: money(squareFees), feesPending, filmmakerShare: share, filmmakerAmount, crateKeeps: money(revenue - squareFees - filmmakerAmount) };
}

export interface SalesSummary {
    tickets: number;
    revenue: number;           // dollars, before Square fees
    averagePaid: number;       // dollars
    withPromo: number;
    last15Min: number;
    recent: { email: string; amount: number; atMs: number | null; type: string }[];
    split?: MoneySplit;
}

const money = (n: number) => Math.round(n * 100) / 100;

export function summarizeSales(records: TicketRecord[], nowMs: number): SalesSummary {
    let revenue = 0, withPromo = 0, last15Min = 0;
    for (const r of records) {
        const amt = typeof r.amountPaid === 'number' && Number.isFinite(r.amountPaid) ? r.amountPaid : 0;
        revenue += amt;
        if (r.promoCode) withPromo++;
        if (r.purchasedAtMs && nowMs - r.purchasedAtMs <= 15 * 60_000) last15Min++;
    }
    const recent = [...records]
        .sort((a, b) => (b.purchasedAtMs || 0) - (a.purchasedAtMs || 0))
        .slice(0, 10)
        .map(r => ({
            email: typeof r.email === 'string' ? r.email : '',
            amount: typeof r.amountPaid === 'number' ? money(r.amountPaid) : 0,
            atMs: r.purchasedAtMs ?? null,
            type: r.paymentType === 'movie' ? 'rental' : 'ticket',
        }));
    return {
        tickets: records.length,
        revenue: money(revenue),
        averagePaid: records.length ? money(revenue / records.length) : 0,
        withPromo,
        last15Min,
        recent,
    };
}

export interface SessionRecord {
    userId: string;
    startedAtMs: number | null;
    lastHeartbeatMs: number | null;
    endedAtMs: number | null;
    watchSeconds: number;
    device: string;
}

export interface DroppedViewer {
    userId: string;
    device: string;
    watchedMinutes: number;
    stoppedMsAgo: number;
    /** 'left' = closed the page or went back; 'quiet' = stopped checking in (switched away, lost connection, or the video got stuck). */
    how: 'left' | 'quiet';
}

/**
 * People whose viewing stopped in the last 15 minutes and who haven't come
 * back (no other session of theirs is live). Most recent first.
 */
export function findDroppedViewers(sessions: SessionRecord[], nowMs: number): DroppedViewer[] {
    const byUser = new Map<string, SessionRecord[]>();
    for (const s of sessions) {
        if (!s.userId) continue;
        const list = byUser.get(s.userId) || [];
        list.push(s);
        byUser.set(s.userId, list);
    }
    const out: DroppedViewer[] = [];
    for (const [userId, list] of byUser) {
        const isLive = list.some(s => !s.endedAtMs && s.lastHeartbeatMs != null && nowMs - s.lastHeartbeatMs < LIVE_WINDOW_MS);
        if (isLive) continue;
        // Their most recent session decides when and how they stopped.
        const latest = list.reduce((a, b) => ((b.startedAtMs || 0) > (a.startedAtMs || 0) ? b : a));
        const stoppedAt = latest.endedAtMs ?? latest.lastHeartbeatMs;
        if (stoppedAt == null) continue;
        const ago = nowMs - stoppedAt;
        if (ago < 0 || ago > DROPPED_WINDOW_MS) continue;
        const totalSeconds = list.reduce((sum, s) => sum + (s.watchSeconds || 0), 0);
        out.push({
            userId,
            device: latest.device === 'mobile' ? 'mobile' : 'desktop',
            watchedMinutes: Math.round(totalSeconds / 60),
            stoppedMsAgo: ago,
            how: latest.endedAtMs ? 'left' : 'quiet',
        });
    }
    return out.sort((a, b) => a.stoppedMsAgo - b.stoppedMsAgo).slice(0, 50);
}

export interface PinnedMessage { text: string; at: number }

/** The pinned announcement to show viewers right now, or null. */
export function activePin(pin: unknown, nowMs: number): PinnedMessage | null {
    if (!pin || typeof pin !== 'object') return null;
    const { text, at } = pin as any;
    if (typeof text !== 'string' || !text.trim() || typeof at !== 'number') return null;
    if (nowMs - at > PIN_MAX_AGE_MS) return null;
    return { text: text.slice(0, PIN_MAX_LENGTH), at };
}
