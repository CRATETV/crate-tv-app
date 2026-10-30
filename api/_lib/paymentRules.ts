// api/_lib/paymentRules.ts
// Pure checkout rules used by api/process-square-payment.ts. Tested in
// tests/paymentRules.test.ts.

/** Promo code problems that mean "don't charge, tell the buyer". Pure, tested. */
export function promoProblem(promo: any, itemId: unknown, nowMs: number = Date.now()): string | null {
    if (!promo) return "That promo code doesn't exist.";
    const maxUses = Number(promo.maxUses);
    if (!Number.isFinite(maxUses) || (Number(promo.usedCount) || 0) >= maxUses) return 'This promo code has reached its maximum usage limit.';
    if (promo.expiresAt && Date.parse(String(promo.expiresAt)) < nowMs) return 'This promo code has expired.';
    if (promo.itemId && promo.itemId !== itemId) return "This promo code doesn't apply to this item.";
    // A free code must name its film or screening. One with no item would open
    // everything on CRATE (every paid party and block), so it is refused.
    if (!promo.itemId && promoMakesFree(promo)) return "This free code isn't linked to a film or screening, so it can't be used.";
    return null;
}

/** Price after a promo code, never below $0 or above the original. Pure, tested. */
export function priceAfterPromo(amountInCents: number, promo: any): number {
    if (promo?.type === 'one_time_access') return 0;
    if (promo?.type === 'discount') {
        const pct = Math.min(100, Math.max(0, Number(promo.discountValue) || 0));
        return Math.max(0, Math.round(amountInCents * ((100 - pct) / 100)));
    }
    return amountInCents;
}

/** True when this code makes the ticket free (a one-time access code, or 100% off). Pure, tested. */
export function promoMakesFree(promo: any): boolean {
    return priceAfterPromo(10_000, promo) === 0;
}

// ── Pay what you want (watch parties) ──────────────────────────────────────
// An admin can switch a watch party to "pay what you want": the viewer picks
// any amount from the minimum up. The minimum covers card fees (Square takes
// about 2.9% + 30¢ of every payment).
export const PWYW_MIN_DOLLARS = 3;
export const PWYW_MAX_DOLLARS = 500;
export const PWYW_SUGGESTED = [3, 5, 10];

/** The amount in cents if it's allowed, otherwise null. Pure, tested. */
export function payWhatYouWantCents(amount: unknown): number | null {
    const dollars = typeof amount === 'string' ? Number(amount.trim()) : Number(amount);
    if (!Number.isFinite(dollars)) return null;
    const cents = Math.round(dollars * 100);
    if (cents < PWYW_MIN_DOLLARS * 100 || cents > PWYW_MAX_DOLLARS * 100) return null;
    return cents;
}

// ── Premiere night payments (Oct 2026) ─────────────────────────────────────
// Filmmakers pay through cratetv.net/book-premiere. Prices are set here, on
// the server: the browser never decides them.
//   premiereBooking  $25  holds the date (both kinds of premiere)
//   premiereBalance  $50  the rest of a free premiere's $75 hosting fee
// A ticketed premiere pays nothing more: CRATE keeps 30% of ticket sales,
// minus the $25 already paid, after the premiere.
export const PREMIERE_PRICES_CENTS: Record<string, number> = {
    premiereBooking: 2500,
    premiereBalance: 5000,
};
export const PREMIERE_LABELS: Record<string, string> = {
    premiereBooking: 'Premiere booking fee',
    premiereBalance: 'Free premiere hosting balance',
};
export const isPremierePayment = (paymentType: unknown): boolean =>
    typeof paymentType === 'string' && Object.prototype.hasOwnProperty.call(PREMIERE_PRICES_CENTS, paymentType);
