// Thank-you email after a watch party. Pure helpers (tests/thankYou.test.ts); the sending
// lives in api/send-watchparty-thanks.ts.

export const DEFAULT_THANK_YOU = `Hi {name},

Thank you for watching {film} with us. A premiere only feels like one because people show up, and it means a lot to the filmmakers and to all of us at Crate TV.

We hope you enjoyed it.

Salome
Crate TV`;

export const MIN_AGE_MS = 12 * 3600_000; // wait until the party is surely over
export const MAX_AGE_MS = 72 * 3600_000; // never thank people for something days old

export interface ViewerRow { id: string; movieKey: string; email?: string | null; name?: string | null; lastSeenMs: number | null; thanked?: boolean }

/** Who is due a thank-you: joined 12 to 72 hours ago, has an email, not thanked yet, not opted out, party not live. */
export function dueViewers(rows: ViewerRow[], nowMs: number, opts: { liveKeys?: Set<string>; skipKeys?: Set<string>; optedOut?: Set<string> } = {}): ViewerRow[] {
    const seen = new Set<string>();
    return rows.filter(r => {
        const email = (r.email || '').trim().toLowerCase();
        if (!email || r.thanked || r.lastSeenMs == null) return false;
        const age = nowMs - r.lastSeenMs;
        if (age < MIN_AGE_MS || age > MAX_AGE_MS) return false;
        if (opts.liveKeys?.has(r.movieKey) || opts.skipKeys?.has(r.movieKey) || opts.optedOut?.has(email)) return false;
        const once = `${r.movieKey}|${email}`;
        if (seen.has(once)) return false;
        seen.add(once);
        return true;
    });
}

export const firstName = (name?: string | null) => {
    const full = (name || '').trim();
    const n = full.split(/\s+/)[0] || '';
    return !n || /^film lover$/i.test(full) ? 'there' : n.slice(0, 40);
};

/** Fills {name} and {film}. Unknown {words} are left alone. */
export function fillThankYou(template: string, vars: { name?: string | null; film: string }): string {
    return (template || DEFAULT_THANK_YOU).replace(/\{name\}/g, firstName(vars.name)).replace(/\{film\}/g, vars.film);
}

export const thankYouSubject = (film: string) => `Thank you for watching ${film}`.replace(/[\r\n]/g, ' ').slice(0, 150);
