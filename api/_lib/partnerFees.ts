// api/_lib/partnerFees.ts
//
// The card (Square) fees on a partner festival's ticket sales, so the payout
// shows exactly what to send. Every sale for another festival is tagged
// "partner:<id>" in Square (api/process-square-payment.ts), and Square reports
// the fee it took on each payment.
import { SquarePayment, fetchAllRelevantPayments, getSquareCredentials } from './filmmakerBalance.js';

export interface PartnerFees {
    /** Total Square fees in dollars. */
    amount: number;
    /** Sales found for this festival in Square. */
    sales: number;
    /** Sales whose fee Square has not reported yet (usually the last day or so). */
    pending: number;
}

/** The tag a sale carries in Square for a partner (cut to Square's 40 letter limit). */
export const partnerReference = (partnerId: string) => `partner:${partnerId}`.slice(0, 40);

/** Adds up the fees on one festival's sales. Pure, tested. */
export function sumPartnerFees(payments: SquarePayment[], partnerId: string): PartnerFees {
    const ref = partnerReference(partnerId);
    let cents = 0, sales = 0, pending = 0;
    for (const p of payments || []) {
        if (!p || p.reference_id !== ref) continue;
        sales++;
        const fees = Array.isArray(p.processing_fee) ? p.processing_fee : [];
        if (fees.length === 0) { pending++; continue; }
        cents += fees.reduce((s, f) => s + (Number(f?.amount_money?.amount) || 0), 0);
    }
    return { amount: Math.round(cents) / 100, sales, pending };
}

/** Looks the fees up in Square. Returns null when Square can't be reached (the payout then shows no fee line). */
export async function loadPartnerFees(partnerId: string): Promise<PartnerFees | null> {
    try {
        const { accessToken, locationId } = getSquareCredentials();
        if (!accessToken) return null;
        return sumPartnerFees(await fetchAllRelevantPayments(accessToken, locationId), partnerId);
    } catch (e) {
        console.error('[partnerFees] could not read Square fees:', e);
        return null;
    }
}

// ─── PWFF (Playhouse West) ─────────────────────────────────────────────────
// From the 2027 festival on, Square's card fees come off PWFF ticket sales before
// the 70/30 split, the same as every partner festival. Sales before this date are
// left exactly as they were settled.
export const PWFF_FEES_SHARED_FROM = '2027-01-01T00:00:00.000Z';

export interface TicketFee { id: string; /** dollars, or null when Square has not reported it */ fee: number | null; shared: boolean }

/** The Square fee on each ticket (matched by the payment id saved on it) and whether it is shared. Pure, tested. */
export function ticketFees(tickets: { id: string; squarePaymentId?: string | null; purchasedAt?: string | null }[], payments: SquarePayment[]): TicketFee[] {
    const byId = new Map<string, number | null>();
    for (const p of payments || []) {
        if (!p?.id) continue;
        const fees = Array.isArray(p.processing_fee) ? p.processing_fee : [];
        byId.set(p.id, fees.length ? fees.reduce((s, f) => s + (Number(f?.amount_money?.amount) || 0), 0) / 100 : null);
    }
    return (tickets || []).map(t => {
        const fee = t.squarePaymentId && byId.has(t.squarePaymentId) ? byId.get(t.squarePaymentId)! : null;
        const shared = !!t.purchasedAt && t.purchasedAt >= PWFF_FEES_SHARED_FROM;
        return { id: t.id, fee: fee === null ? null : Math.round(fee * 100) / 100, shared };
    });
}

/** Loads every Square payment once so ticket fees can be matched. Null when Square can't be reached. */
export async function loadAllPayments(): Promise<SquarePayment[] | null> {
    try {
        const { accessToken, locationId } = getSquareCredentials();
        if (!accessToken) return null;
        return await fetchAllRelevantPayments(accessToken, locationId);
    } catch (e) {
        console.error('[partnerFees] could not read Square payments:', e);
        return null;
    }
}
