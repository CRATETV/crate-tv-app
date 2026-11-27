// api/_lib/mailText.ts — tidies a received email for reading in the Email tab.
// Pure text helpers (no server-only imports), so the page and the tests can both use them.
//
// Phones and mail apps paste the whole earlier conversation under every reply, often as
// pages of ">" marks and blank lines. Shown as-is it filled the screen with nothing and
// pushed the reply box far out of sight. We show what the person wrote, and keep the
// earlier messages one tap away.

/** A line that is empty, or only quote marks (">") and spaces. */
const isBlankish = (line: string) => /^[\s>]*$/.test(line);

// Where the earlier conversation starts.
const QUOTE_MARKERS: RegExp[] = [
    /^On [\s\S]{4,250}?\bwrote:[ \t]*$/m,                    // Apple Mail, Gmail: "On Nov 27, 2026, at 12:49 PM, Crate TV <…> wrote:"
    /^-{2,}\s*(Original Message|Forwarded message)\s*-{2,}[ \t]*$/im,
    /^_{5,}[ \t]*\r?\n\s*From:/m,                             // Outlook
    /^From:[^\n]+\r?\n(Sent|Date):[^\n]+/m,
];

/** Cleans the spacing of a block of email text: line endings, trailing spaces, runs of blank lines. */
export function tidyEmailText(text: string): string {
    return (text || '')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Splits an email into what the sender wrote and the earlier messages quoted under it.
 * `quoted` is only returned when it holds real words, not just ">" marks and blank lines.
 */
export function splitQuotedReply(text: string): { main: string; quoted: string } {
    const clean = tidyEmailText(text);
    if (!clean) return { main: '', quoted: '' };

    let cut = -1;
    for (const re of QUOTE_MARKERS) {
        const m = re.exec(clean);
        if (m && (cut === -1 || m.index < cut)) cut = m.index;
    }

    // Lines that start with ">" all the way to the end are quoted text too.
    if (cut === -1) {
        const lines = clean.split('\n');
        let firstQuoted = -1;
        for (let i = 0; i < lines.length; i++) {
            if (/^\s*>/.test(lines[i])) { firstQuoted = i; break; }
        }
        if (firstQuoted > -1 && lines.slice(firstQuoted).every(l => isBlankish(l) || /^\s*>/.test(l))) {
            cut = lines.slice(0, firstQuoted).join('\n').length + (firstQuoted > 0 ? 1 : 0);
        }
    }

    // If the whole email is quoted (nothing above the marker), show it all.
    if (cut <= 0) return { main: clean, quoted: '' };

    const main = tidyEmailText(clean.slice(0, cut));
    const rest = tidyEmailText(clean.slice(cut).split('\n').filter((l, i) => i === 0 || !isBlankish(l) || l.trim() === '').join('\n'));
    // The marker line ("On … wrote:") on its own, with nothing real after it, is not worth showing.
    const body = rest.split('\n').slice(1).filter(l => !isBlankish(l)).join(' ').trim();
    return { main: main || clean, quoted: body ? rest : '' };
}
