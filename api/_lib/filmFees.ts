// api/_lib/filmFees.ts — Square's card fees are shared with the filmmaker.
//
// From FILM_FEES_SHARED_FROM on, the fee Square took on a film payment (rental, watch
// party ticket or tip) comes off the top before the filmmaker/CRATE split, the same
// as partner festivals. Payments before then stay exactly as they were counted.
// If Square has not reported the fee yet (usually the last day or so), the payment
// counts in full for now and drops by the fee once Square reports it.
//
// Pure helpers, tested in tests/filmFees.test.ts.

/** Oct 31 2026, 8:00 pm in Philadelphia. */
export const FILM_FEES_SHARED_FROM = '2026-11-01T00:00:00.000Z';

export interface PaymentLike { amount_money: { amount: number }; created_at?: string; processing_fee?: { amount_money?: { amount: number } }[] }

/** Square's fee on a payment, in cents; null when Square has not reported one. */
export function reportedFeeCents(p: Pick<PaymentLike, 'processing_fee'>): number | null {
    const fees = Array.isArray(p.processing_fee) ? p.processing_fee : [];
    if (fees.length === 0) return null;
    return Math.max(0, Math.round(fees.reduce((s, f) => s + (Number(f?.amount_money?.amount) || 0), 0)));
}

/** True when this payment's fee is shared with the filmmaker. */
export const feeIsShared = (createdAt?: string) => !!createdAt && createdAt >= FILM_FEES_SHARED_FROM;

/** What the filmmaker/CRATE split is figured on for one payment, in cents. */
export function splittableCents(p: PaymentLike): number {
    const amount = Math.max(0, Math.round(p.amount_money.amount));
    if (!feeIsShared(p.created_at)) return amount;
    const fee = reportedFeeCents(p);
    return fee === null ? amount : Math.max(0, amount - fee);
}

// ─── The money breakdown shown for each film ───────────────────────────────

export interface FilmBreakdown {
    /** What buyers paid, before any fees. */
    buyersPaid: number;
    /** Square's card fees that are shared (payments from FILM_FEES_SHARED_FROM on). */
    cardFees: number;
    /** What the split is figured on: buyers paid minus shared card fees. */
    afterFees: number;
    /** The filmmaker side's percent (70 unless the film has its own deal). */
    filmmakerPercent: number;
    /** The whole filmmaker side, before it is divided among co-credited people. */
    filmmakerSide: number;
    /** What CRATE keeps. */
    crateShare: number;
    /** The part that goes to the person looking (after co-credits). */
    yourShare: number;
}

/** Cents in, cents out. The pieces always add up: afterFees = filmmakerSide + crateShare. Pure, tested. */
export function buildFilmBreakdown(i: { buyersPaid: number; afterFees: number; filmmakerPercent: number; filmmakerSide: number; crateShare: number; yourShare: number }): FilmBreakdown {
    const buyersPaid = Math.max(0, Math.round(i.buyersPaid));
    const afterFees = Math.min(buyersPaid, Math.max(0, Math.round(i.afterFees)));
    return {
        buyersPaid, afterFees, cardFees: buyersPaid - afterFees,
        filmmakerPercent: i.filmmakerPercent,
        filmmakerSide: Math.round(i.filmmakerSide), crateShare: Math.round(i.crateShare), yourShare: Math.round(i.yourShare),
    };
}
