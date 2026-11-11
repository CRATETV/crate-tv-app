// Plain-words ticket lines for help reports (api/festival-help.ts; tests/helpTicketLabels.test.ts).
// A ticket whose film or screening can't be found used to be listed by its raw code
// ("block_1781650941844"), once per ticket. Now it says what it is, and repeats are counted.

const RAW = /^(block|movie|film)_\d{6,}$/i;

/** Raw code -> words the person reading the report understands. The code stays in brackets so it can still be looked up. */
export function friendlyTicketLabel(label: string): string {
    const l = (label || '').trim();
    if (!RAW.test(l)) return l || 'Unknown ticket';
    return /^block_/i.test(l) ? `A screening that is no longer on the schedule (${l})` : `A film with no title on file (${l})`;
}

/** Same line repeated N times becomes one line with "×N". Order of first appearance is kept. */
export function collapseTickets<T extends { label: string; status: string }>(tickets: T[]): (T & { count: number })[] {
    const out = new Map<string, T & { count: number }>();
    for (const t of tickets) {
        const k = `${t.label}\u0000${t.status}`;
        const hit = out.get(k);
        if (hit) hit.count += 1; else out.set(k, { ...t, count: 1 });
    }
    return [...out.values()];
}
