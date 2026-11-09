// Where a visitor came from, in plain words ("instagram", "google", "direct").
//
// The old code saved the Referer header of the tracking request itself, which is
// always the visitor's own page on cratetv.net, so every visit looked "direct".
// The browser now sends the real previous site (document.referrer) and any
// ?src= / ?utm_source= tag on the link, and this tidies it into one label.
// Used by the browser and the server. Tested in tests/trafficSource.test.ts.

const KNOWN: [RegExp, string][] = [
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'],
    [/(^|\.)(twitter\.com|x\.com|t\.co)$/, 'x'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
    [/(^|\.)google\.[a-z.]+$/, 'google'],
    [/(^|\.)bing\.com$/, 'bing'],
    [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
    [/(^|\.)reddit\.com$/, 'reddit'],
    [/(^|\.)linkedin\.com$/, 'linkedin'],
    [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
    [/(^|\.)(mail\.google\.com|outlook\.live\.com|mail\.yahoo\.com)$/, 'email'],
];

const OWN_HOSTS = /(^|\.)(cratetv\.net|localhost)$|\.vercel\.app$/;

/** A tag typed on a link, e.g. ?src=ig-story. Lowercased, letters/digits/dashes only. */
export function cleanTag(tag: unknown): string {
    return String(tag ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/** Turns a link tag or a referrer address into one short label. */
export function normalizeSource(input: unknown): string {
    const raw = String(input ?? '').trim();
    if (!raw) return 'direct';
    if (!/[./:]/.test(raw)) return cleanTag(raw) || 'direct';          // already a tag like "instagram"
    let host = '';
    try { host = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase(); } catch { return 'other'; }
    if (!host || OWN_HOSTS.test(host)) return 'direct';                // came from our own pages: not a new source
    for (const [re, label] of KNOWN) if (re.test(host)) return label;
    return host.replace(/^www\./, '').replace(/[^a-z0-9.-]+/g, '').slice(0, 40) || 'other';
}
