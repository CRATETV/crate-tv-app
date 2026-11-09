import { cleanTag, normalizeSource } from '../api/_lib/trafficSource';

// Works out where this visitor came from, once per browser session, so every
// visit and view in the session carries the same label. A ?src= or ?utm_source=
// tag on the link wins (so a link in your Instagram bio can say src=ig-bio);
// otherwise the site they arrived from; otherwise "direct".
const KEY = 'crate-source';

export function getTrafficSource(): string {
    try {
        const saved = sessionStorage.getItem(KEY);
        if (saved) return saved;
    } catch { /* private window */ }
    let source = 'direct';
    try {
        const params = new URLSearchParams(window.location.search);
        const tag = cleanTag(params.get('src') || params.get('utm_source'));
        source = tag || normalizeSource(document.referrer);
    } catch { /* keep direct */ }
    try { sessionStorage.setItem(KEY, source); } catch { /* none */ }
    return source;
}
