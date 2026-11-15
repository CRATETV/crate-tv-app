// api/_lib/festivalSettlement.ts — what CRATE owes the festival (Playhouse West) and what CRATE keeps.
//
// Festival passes and blocks are settled under the festival agreement: the festival gets 70%, CRATE 30%.
// From PWFF_FEES_SHARED_FROM on, Square's card fee on each sale comes off the top before that split
// (before then, nothing is taken off first). Pure, tested in tests/festivalSettlement.test.ts.

export const FESTIVAL_SHARE = 0.7;
/** The name the festival is paid under in "Who you owe". */
export const FESTIVAL_PAYEE_NAME = 'Playhouse West Film Festival';

export interface FestivalPayment { cents: number; feeCents: number | null; at?: string | null }
export interface FestivalSettlement {
    count: number;
    grossCents: number;
    /** Card fees taken off before the split (only sales on or after the shared-fees date). */
    sharedFeesCents: number;
    /** Sales whose Square fee isn't reported yet and will come off the top once it is. */
    feesPending: number;
    owedToFestivalCents: number;
    crateKeepsCents: number;
}

export function festivalSettlement(payments: FestivalPayment[], feesSharedFrom: string, share: number = FESTIVAL_SHARE): FestivalSettlement {
    let gross = 0, shared = 0, pending = 0;
    for (const p of payments) {
        if (!(p.cents > 0)) continue;
        gross += p.cents;
        if (p.at && p.at >= feesSharedFrom) {
            if (p.feeCents === null) pending++; else shared += p.feeCents;
        }
    }
    const s = Math.min(1, Math.max(0, share));
    const owed = Math.round(Math.max(0, gross - shared) * s);
    return { count: payments.filter(p => p.cents > 0).length, grossCents: gross, sharedFeesCents: shared, feesPending: pending, owedToFestivalCents: owed, crateKeepsCents: gross - owed };
}
