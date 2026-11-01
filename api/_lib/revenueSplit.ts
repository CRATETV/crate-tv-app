// Revenue splits — who gets what from a film's earnings.
//
// Every film's money (donations, watch party tickets, on-demand rentals) is
// split between the filmmaker side and CRATE. The default is 70% to the
// filmmaker side and 30% to CRATE. A film can have its own deal, set in
// Admin → Earnings & Payouts, stored in the `film_deals` collection (one
// document per movie key). Deals are kept out of the movie document on
// purpose: the movie editor saves whole movie objects and would otherwise
// overwrite a split set elsewhere.
//
// The filmmaker side is then divided among the people who get paid:
//   • If the deal lists payees with shares, those shares are used.
//   • Otherwise it's divided EQUALLY among everyone credited as director or
//     producer. (Before Oct 2026 each credited person was given the full
//     filmmaker share, so a film with two credits showed 140% being owed.)
//
// Pure functions only — no database — so they can be tested directly.

export const DEFAULT_FILMMAKER_SHARE = 0.70;

export interface FilmDealPayee {
    name: string;
    /** Relative weight. Shares are normalised, so 50/50, 1/1 and 60/40 all work. */
    share: number;
}

export interface FilmDeal {
    /** Fraction of revenue that goes to the filmmaker side, 0–1. */
    filmmakerShare?: number;
    payees?: FilmDealPayee[];
    notes?: string;
}

export const normalizeName = (name: string): string => (name || '').trim().toLowerCase();

/** Splits "A, B" credit strings. */
export const splitCredits = (value: string | undefined): string[] =>
    (value || '').split(',').map(s => s.trim()).filter(Boolean);

/** The filmmaker side's fraction for a film, clamped to 0–1. */
export function filmmakerShareOf(deal: FilmDeal | undefined): number {
    const raw = deal?.filmmakerShare;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_FILMMAKER_SHARE;
    return Math.min(1, Math.max(0, raw));
}

/**
 * Who shares the filmmaker side, and what fraction of it each gets.
 * Fractions add up to 1 (or the list is empty when nobody is credited).
 * Names that differ only by case/spacing are merged.
 */
export function payeeFractions(
    credits: { director?: string; producers?: string },
    deal: FilmDeal | undefined,
): { name: string; key: string; fraction: number }[] {
    const merge = (list: { name: string; weight: number }[]) => {
        const byKey = new Map<string, { name: string; key: string; weight: number }>();
        for (const { name, weight } of list) {
            const key = normalizeName(name);
            if (!key || !(weight > 0)) continue;
            const existing = byKey.get(key);
            if (existing) existing.weight += weight;
            else byKey.set(key, { name: name.trim(), key, weight });
        }
        const total = [...byKey.values()].reduce((s, p) => s + p.weight, 0);
        if (total <= 0) return [];
        return [...byKey.values()].map(p => ({ name: p.name, key: p.key, fraction: p.weight / total }));
    };

    const custom = (deal?.payees || []).filter(p => p && typeof p.name === 'string' && Number(p.share) > 0);
    if (custom.length) {
        const result = merge(custom.map(p => ({ name: p.name, weight: Number(p.share) })));
        if (result.length) return result;
    }
    const credited = [...splitCredits(credits.director), ...splitCredits(credits.producers)];
    return merge(credited.map(name => ({ name, weight: 1 })));
}

/**
 * Adds "the person who signed the film's agreement" as the payee for films whose deal does not
 * already name one. A payee named on purpose in the deal always wins. Pure, tested.
 */
export function applySignedPayees(
    deals: Record<string, FilmDeal>,
    signed: Record<string, { name?: string } | undefined>,
): Record<string, FilmDeal> {
    const out: Record<string, FilmDeal> = { ...deals };
    for (const [movieKey, s] of Object.entries(signed)) {
        const name = typeof s?.name === 'string' ? s.name.trim() : '';
        if (!name) continue;
        const existing = out[movieKey];
        if (existing?.payees?.some(p => p && typeof p.name === 'string' && Number(p.share) > 0)) continue;
        out[movieKey] = { ...(existing || {}), payees: [{ name, share: 100 }] };
    }
    return out;
}

export interface SplitResult {
    gross: number;
    filmmakerShare: number;
    filmmakerAmount: number;
    crateAmount: number;
    payees: { name: string; key: string; fraction: number; amount: number }[];
}

/**
 * Splits an amount in cents. Rounding is done so the payees' amounts add up
 * exactly to filmmakerAmount, and filmmakerAmount + crateAmount === gross.
 */
export function splitRevenue(
    grossCents: number,
    credits: { director?: string; producers?: string },
    deal: FilmDeal | undefined,
): SplitResult {
    const gross = Math.max(0, Math.round(grossCents || 0));
    const share = filmmakerShareOf(deal);
    const people = payeeFractions(credits, deal);
    // Nobody to pay → nothing is owed to anyone; CRATE holds it until credits are fixed.
    const filmmakerAmount = people.length ? Math.round(gross * share) : 0;

    // Largest-remainder rounding so pennies are never created or lost.
    const exact = people.map(p => ({ ...p, raw: filmmakerAmount * p.fraction }));
    const floored = exact.map(p => ({ ...p, amount: Math.floor(p.raw) }));
    let leftover = filmmakerAmount - floored.reduce((s, p) => s + p.amount, 0);
    const order = [...floored.keys()].sort((a, b) => (exact[b].raw - floored[b].amount) - (exact[a].raw - floored[a].amount));
    for (const i of order) {
        if (leftover <= 0) break;
        floored[i].amount += 1;
        leftover -= 1;
    }

    return {
        gross,
        filmmakerShare: share,
        filmmakerAmount,
        crateAmount: gross - filmmakerAmount,
        payees: floored.map(({ name, key, fraction, amount }) => ({ name, key, fraction, amount })),
    };
}

/** Validates a deal coming from the admin form. Returns an error message or the cleaned deal. */
export function cleanDeal(input: any): { deal?: FilmDeal; error?: string } {
    const percent = Number(input?.filmmakerPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return { error: 'The filmmaker share must be a number from 0 to 100.' };
    }
    const payees: FilmDealPayee[] = Array.isArray(input?.payees)
        ? input.payees
            .map((p: any) => ({ name: String(p?.name || '').trim().slice(0, 120), share: Number(p?.share) }))
            .filter((p: FilmDealPayee) => p.name && Number.isFinite(p.share) && p.share > 0)
            .slice(0, 12)
        : [];
    const notes = String(input?.notes || '').slice(0, 1000);
    return { deal: { filmmakerShare: Math.round(percent * 100) / 10000, payees, notes } };
}

// ── Payout links ────────────────────────────────────────────────────────────

export type PayoutMethod = 'paypal' | 'cashapp' | 'venmo' | 'zelle' | 'check' | 'other';

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
    paypal: 'PayPal',
    cashapp: 'Cash App',
    venmo: 'Venmo',
    zelle: 'Zelle',
    check: 'Check / bank transfer',
    other: 'Other',
};

/**
 * A link that opens the payment app with the amount filled in, where the app
 * supports that. Zelle, checks and "other" have no such link (null) — the
 * admin copies the handle and amount instead.
 */
export function payoutLink(method: PayoutMethod | undefined, handle: string | undefined, cents: number, note = 'CRATE TV payout'): string | null {
    const h = (handle || '').trim();
    if (!h || !(cents > 0)) return null;
    const dollars = (Math.round(cents) / 100).toFixed(2);
    const enc = encodeURIComponent;
    switch (method) {
        case 'paypal': {
            const user = h.replace(/^(https?:\/\/)?(www\.)?(paypal\.me|paypal\.com\/paypalme)\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
            return /^[A-Za-z0-9._-]{1,40}$/.test(user) ? `https://www.paypal.com/paypalme/${enc(user)}/${dollars}USD` : null;
        }
        case 'cashapp': {
            const tag = h.replace(/^(https?:\/\/)?cash\.app\//i, '').replace(/^\$/, '').split(/[/?#]/)[0];
            return /^[A-Za-z0-9_-]{1,30}$/.test(tag) ? `https://cash.app/$${enc(tag)}/${dollars}` : null;
        }
        case 'venmo': {
            const user = h.replace(/^(https?:\/\/)?(www\.)?venmo\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
            return /^[A-Za-z0-9_-]{1,40}$/.test(user)
                ? `https://venmo.com/${enc(user)}?txn=pay&amount=${dollars}&note=${enc(note)}`
                : null;
        }
        default:
            return null;
    }
}
