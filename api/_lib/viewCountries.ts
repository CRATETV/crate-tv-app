// api/_lib/viewCountries.ts
//
// "Where did people watch?" for one film: counts the saved view records by
// country. Every counted view (website or Roku) is saved with the country the
// visitor connected from, never their name or email.
export interface CountryViews { code: string; name: string; views: number; web: number; roku: number }

let names: Intl.DisplayNames | null = null;
function countryName(code: string): string {
    if (!code || code === 'unknown') return 'Unknown';
    try {
        names = names || new Intl.DisplayNames(['en'], { type: 'region' });
        return names.of(code) || code;
    } catch { return code; }
}

export function viewsByCountry(events: { country?: unknown; platform?: unknown; type?: unknown }[]): CountryViews[] {
    const by = new Map<string, CountryViews>();
    for (const e of events || []) {
        if (!e || (e.type && e.type !== 'VIEW')) continue;
        const code = typeof e.country === 'string' && e.country.trim() ? e.country.trim().toUpperCase() : 'unknown';
        const row = by.get(code) || { code, name: countryName(code), views: 0, web: 0, roku: 0 };
        row.views++;
        if (e.platform === 'ROKU') row.roku++; else row.web++;
        by.set(code, row);
    }
    return [...by.values()].sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));
}
