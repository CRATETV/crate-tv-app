// Words and layout maths for the "Share a film" Instagram graphic. Pure + tested
// (tests/shareCopy.test.ts); the canvas drawing itself lives in components/admin/ShareFilmTab.tsx.

/** Link to put in the bio / caption. `?src=instagram` lets the audience card show Instagram as a source. */
export function shareLink(origin: string, key: string, src = 'instagram'): string {
    return `${origin.replace(/\/+$/, '')}/movie/${encodeURIComponent(key)}?src=${encodeURIComponent(src)}`;
}

/** Cut a synopsis at a word boundary so it fits the graphic. */
export function trimSynopsis(text: string, maxChars: number): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= maxChars) return t;
    const cut = t.slice(0, maxChars - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
}

/** Greedy word wrap. `measure` is ctx.measureText(...).width in the browser. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = 99): string[] {
    const words = (text || '').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (line && measure(next) > maxWidth) { lines.push(line); line = w; } else line = next;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,;:.\-–—]+$/, '') + '…';
        return kept;
    }
    return lines;
}

export type ShareKind = 'premiere' | 'streaming';
export interface ShareFilm { title: string; director?: string; synopsis?: string; isWatchPartyEnabled?: boolean; watchPartyStartTime?: string; isWatchPartyPaid?: boolean; watchPartyPayWhatYouWant?: boolean; watchPartyPrice?: number }

/** A film with a watch party that has not finished yet is a premiere. */
export function detectKind(f: ShareFilm, nowMs = Date.now()): ShareKind {
    const t = f.watchPartyStartTime ? Date.parse(f.watchPartyStartTime) : NaN;
    return f.isWatchPartyEnabled && Number.isFinite(t) && t > nowMs - 3 * 3600_000 ? 'premiere' : 'streaming';
}

/** "Friday, November 13 · 7:30 PM ET" (always Eastern time, the festival's clock). */
export function premiereWhen(iso?: string): string {
    const t = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(t)) return '';
    const d = new Date(t);
    const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
    return `${day} · ${time} ET`;
}

export function ticketLine(f: ShareFilm): string {
    if (!f.isWatchPartyPaid) return 'Free to watch';
    if (f.watchPartyPayWhatYouWant) return 'Pay what you want · from $3';
    return f.watchPartyPrice ? `Tickets $${Number(f.watchPartyPrice).toFixed(2).replace(/\.00$/, '')}` : '';
}

/** What the graphic says: badge, a line under the title, and the call to action. */
export function shareWording(f: ShareFilm, kind: ShareKind) {
    if (kind === 'premiere') {
        return { badge: 'LIVE PREMIERE', when: premiereWhen(f.watchPartyStartTime), price: ticketLine(f), cta: 'Watch live in the Premieres section on Crate TV' };
    }
    return { badge: 'NOW STREAMING', when: '', price: '', cta: 'Watch free on Crate TV' };
}

/** Ready-to-paste Instagram caption. */
export function instagramCaption(f: ShareFilm, link: string, kind: ShareKind = detectKind(f)): string {
    const w = shareWording(f, kind);
    const head = kind === 'premiere' ? `🎬 PREMIERE — ${f.title}` : `🎬 ${f.title}`;
    return [
        `${head}${f.director ? ` — directed by ${f.director}` : ''}`,
        kind === 'premiere' && w.when ? `📅 ${w.when}${w.price ? ` · ${w.price}` : ''}` : '',
        '',
        trimSynopsis(f.synopsis || '', 300),
        '',
        kind === 'premiere' ? `${w.cta}. Link in bio: ${link}` : `Watch it free on Crate TV. Link in bio: ${link}`,
        '',
        '#indiefilm #shortfilm #independentfilm #cratetv',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n').replace(/\n{3,}/g, '\n\n');
}
