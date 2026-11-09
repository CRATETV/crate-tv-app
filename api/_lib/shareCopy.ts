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

/** Ready-to-paste Instagram caption. */
export function instagramCaption(f: { title: string; director?: string; synopsis?: string }, link: string): string {
    return [
        `🎬 ${f.title}${f.director ? ` — directed by ${f.director}` : ''}`,
        '',
        trimSynopsis(f.synopsis || '', 300),
        '',
        `Watch it free on Crate TV. Link in bio: ${link}`,
        '',
        '#indiefilm #shortfilm #independentfilm #cratetv',
    ].join('\n');
}
