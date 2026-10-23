// Spotting likely double charges, e.g. someone tapping "Pay" twice on a slow
// phone. Pure functions (no database, no Square) so they can be tested.
//
// Two payments look like a double charge when they are for the same thing
// (same Square note), the same amount, from the same buyer (same email when
// we know it, otherwise the same card's last 4 digits), within a short window,
// and neither has been refunded yet. The FIRST one is treated as the real
// purchase; every later one is flagged as the likely extra charge.

export interface ChargeLike {
    id: string;
    createdAt: string;          // ISO time
    amount: number;             // cents charged
    refunded: number;           // cents already refunded
    note: string;
    email?: string | null;
    cardLast4?: string | null;
}

export const DUPLICATE_WINDOW_MS = 15 * 60_000;

const buyerKey = (c: ChargeLike) =>
    (c.email && c.email.trim().toLowerCase()) || (c.cardLast4 ? `card:${c.cardLast4}` : '');

/** Map of paymentId → the id of the earlier payment it duplicates. */
export function findLikelyDuplicates(charges: ChargeLike[], windowMs = DUPLICATE_WINDOW_MS): Map<string, string> {
    const out = new Map<string, string>();
    const groups = new Map<string, ChargeLike[]>();
    for (const c of charges) {
        const buyer = buyerKey(c);
        if (!buyer || !(c.amount > 0) || c.refunded >= c.amount) continue;
        const key = `${buyer}|${(c.note || '').trim().toLowerCase()}|${c.amount}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
    }
    for (const list of groups.values()) {
        if (list.length < 2) continue;
        list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        let anchor = list[0];
        for (let i = 1; i < list.length; i++) {
            const c = list[i];
            if (Date.parse(c.createdAt) - Date.parse(anchor.createdAt) <= windowMs) out.set(c.id, anchor.id);
            else anchor = c; // far enough apart to be a genuine second purchase
        }
    }
    return out;
}

/** How much of a payment can still be refunded, in cents. */
export const refundableCents = (c: Pick<ChargeLike, 'amount' | 'refunded'>) => Math.max(0, (c.amount || 0) - (c.refunded || 0));

/** Validates a refund request. Returns an error message, or null when it's fine. */
export function refundProblem(c: Pick<ChargeLike, 'amount' | 'refunded'> & { status?: string }, requested: number): string | null {
    if (c.status && c.status !== 'COMPLETED') return `This payment is ${c.status.toLowerCase()} and can't be refunded.`;
    if (!Number.isInteger(requested) || requested <= 0) return 'Enter an amount to refund.';
    const left = refundableCents(c);
    if (left <= 0) return 'This payment has already been fully refunded.';
    if (requested > left) return `You can refund at most $${(left / 100).toFixed(2)} on this payment.`;
    return null;
}
