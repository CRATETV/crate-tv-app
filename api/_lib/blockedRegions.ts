// api/_lib/blockedRegions.ts
//
// Places CRATE does not serve (Oct 2026): US sanctions bar doing business with
// them, so films don't play and cards aren't charged there. The place comes from
// the visitor's internet address (Vercel adds it to every request).
//
// Edit the lists below to change what is blocked; ask a lawyer before removing
// anything. Codes: two-letter countries; regions are ISO 3166-2 numbers.
export const BLOCKED_COUNTRIES = ['CU', 'IR', 'KP', 'SY'];                       // Cuba, Iran, North Korea, Syria
export const BLOCKED_REGIONS: Record<string, string[]> = {
    UA: ['43', '40', '14', '09'],                                                  // Crimea, Sevastopol, Donetsk, Luhansk (Ukraine)
};

export const BLOCKED_MESSAGE = "CRATE TV isn't available in your region.";

/** True for a blocked country, or a blocked region inside one. Pure, tested. */
export function isBlockedLocation(country?: string | null, region?: string | null): boolean {
    const c = (country || '').trim().toUpperCase();
    if (!c) return false;                       // unknown location: allowed
    if (BLOCKED_COUNTRIES.includes(c)) return true;
    const r = (region || '').trim().toUpperCase();
    return !!r && (BLOCKED_REGIONS[c] || []).includes(r);
}

/** Reads the visitor's place from the request's Vercel headers. */
export function isBlockedRequest(request: Request): boolean {
    return isBlockedLocation(request.headers.get('x-vercel-ip-country'), request.headers.get('x-vercel-ip-country-region'));
}

export const blockedResponse = () =>
    new Response(JSON.stringify({ error: BLOCKED_MESSAGE, blocked: true }), { status: 451, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
