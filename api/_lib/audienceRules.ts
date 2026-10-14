// api/_lib/audienceRules.ts
//
// Pure rules for two audience features (tests/audience.test.ts):
//   • Audience Choice — ticket holders vote for their favourite film in a
//     festival block; the admin awards the winner a laurel.
//   • Who's watching map — the cities a watch party's audience joined from
//     (city-level only, from Vercel's free location headers; no names, no IPs).

const DAY = 24 * 60 * 60 * 1000;

// ─── Audience Choice ──────────────────────────────────────────────────────

/** Voting opens when the block starts and closes when its rewatch week ends. */
export function votingWindow(
    block: { screeningStartTime?: string | null; watchPartyStartTime?: string | null; festivalEndTime?: string | null },
    rewatchWindowMs: number,
): { opensMs: number; closesMs: number } | null {
    const start = Date.parse(String(block.screeningStartTime || block.watchPartyStartTime || ''));
    if (!Number.isFinite(start)) return null;
    const ended = Date.parse(String(block.festivalEndTime || ''));
    const base = Number.isFinite(ended) && ended > start ? ended : start;
    return { opensMs: start, closesMs: base + rewatchWindowMs + DAY };
}

export type VotingState = 'not-open' | 'open' | 'closed' | 'no-date';

export function votingState(block: Parameters<typeof votingWindow>[0], rewatchWindowMs: number, nowMs: number): VotingState {
    const w = votingWindow(block, rewatchWindowMs);
    if (!w) return 'no-date';
    if (nowMs < w.opensMs) return 'not-open';
    return nowMs <= w.closesMs ? 'open' : 'closed';
}

export interface FilmTally { movieKey: string; votes: number; share: number }

/** Votes per film in the block (films with no votes included), most first. */
export function tallyVotes(movieKeys: string[], votes: { movieKey: string }[]): { results: FilmTally[]; total: number; leaders: string[] } {
    const counts = new Map(movieKeys.map(k => [k, 0]));
    for (const v of votes) if (counts.has(v.movieKey)) counts.set(v.movieKey, counts.get(v.movieKey)! + 1);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const results = [...counts.entries()]
        .map(([movieKey, n]) => ({ movieKey, votes: n, share: total ? Math.round((n / total) * 1000) / 10 : 0 }))
        .sort((a, b) => b.votes - a.votes);
    const top = results[0]?.votes || 0;
    const leaders = top > 0 ? results.filter(r => r.votes === top).map(r => r.movieKey) : [];
    return { results, total, leaders };
}

export const audienceVoteId = (blockId: string, uid: string) => `${blockId}__${uid}`;

// ─── Who's watching map ───────────────────────────────────────────────────

export interface CityPoint { city: string; region: string; country: string; lat: number; lng: number; viewers: number }

/** Reads Vercel's location headers. Returns null when there's no usable location. */
export function cityFromHeaders(get: (name: string) => string | null): Omit<CityPoint, 'viewers'> | null {
    const dec = (v: string | null) => { try { return v ? decodeURIComponent(v).trim().slice(0, 80) : ''; } catch { return ''; } };
    const lat = Number(get('x-vercel-ip-latitude'));
    const lng = Number(get('x-vercel-ip-longitude'));
    const country = dec(get('x-vercel-ip-country')).toUpperCase().slice(0, 2);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !country || (lat === 0 && lng === 0)) return null;
    return {
        city: dec(get('x-vercel-ip-city')) || 'Unknown city',
        region: dec(get('x-vercel-ip-country-region')).slice(0, 10),
        country,
        // Rounded to ~10 km: enough to place a dot on the map, never an address.
        lat: Math.round(lat * 10) / 10,
        lng: Math.round(lng * 10) / 10,
    };
}

/** Firestore-safe key for a city ("Philadelphia, PA, US" → "US_PA_philadelphia"). */
export function cityKey(c: { city: string; region: string; country: string }): string {
    return `${c.country}_${c.region}_${c.city}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9_]+/g, '-').slice(0, 100);
}

/** Map geometry: matches public/audience-world-map.svg (equirectangular, lat 84°N to 58°S). */
export const MAP_WIDTH = 1000;
export const MAP_TOP_LAT = 84;
export const MAP_BOTTOM_LAT = -58;
export const MAP_HEIGHT = ((MAP_TOP_LAT - MAP_BOTTOM_LAT) / 360) * MAP_WIDTH;

/** Where a lat/lng sits on the map, as percentages of its width and height. */
export function mapPosition(lat: number, lng: number): { xPct: number; yPct: number } {
    const x = ((lng + 180) / 360) * MAP_WIDTH;
    const y = ((MAP_TOP_LAT - Math.max(MAP_BOTTOM_LAT, Math.min(MAP_TOP_LAT, lat))) / 360) * MAP_WIDTH;
    return { xPct: (x / MAP_WIDTH) * 100, yPct: (y / MAP_HEIGHT) * 100 };
}

export function summarizeCities(points: CityPoint[]): { cities: number; countries: number; viewers: number; top: CityPoint[] } {
    const sorted = [...points].sort((a, b) => b.viewers - a.viewers);
    return {
        cities: sorted.length,
        countries: new Set(sorted.map(p => p.country)).size,
        viewers: sorted.reduce((a, p) => a + p.viewers, 0),
        top: sorted.slice(0, 8),
    };
}
