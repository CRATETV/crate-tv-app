// "Where do people come from?" and "how many come back?" for the Stats tab.
// Reads the visit/view log (traffic_events). Pure, tested in tests/audienceInsights.test.ts.

export interface TrafficEvent { type?: string; source?: string; uid?: string; tsMs: number | null }

export interface AudienceInsights {
    /** Visits in the window by where they came from, biggest first. */
    sources: { source: string; count: number; pct: number }[];
    visitsWithSource: number;
    /** Signed-in viewers who watched, and how many watched on 2+ different days. */
    viewers: number;
    returning: number;
    returningPct: number;
    /** How many days of this tracking exist so far (it started when this shipped). */
    daysOfData: number;
}

const dayKey = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export function audienceInsights(events: TrafficEvent[], nowMs: number, windowDays = 30): AudienceInsights {
    const since = nowMs - windowDays * 86_400_000;
    const counts = new Map<string, number>();
    const daysByUid = new Map<string, Set<string>>();
    let visitsWithSource = 0;
    let firstTracked: number | null = null;

    for (const e of events) {
        if (e.tsMs == null || e.tsMs < since) continue;
        const tracked = typeof e.source === 'string' && e.source !== '';
        if (tracked && (firstTracked == null || e.tsMs < firstTracked)) firstTracked = e.tsMs;
        if (e.type === 'VISIT' && tracked) {
            visitsWithSource++;
            counts.set(e.source!, (counts.get(e.source!) || 0) + 1);
        }
        if (e.type === 'VIEW' && e.uid) {
            const set = daysByUid.get(e.uid) || new Set<string>();
            set.add(dayKey(e.tsMs));
            daysByUid.set(e.uid, set);
        }
    }

    const sources = [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
        .map(([source, count]) => ({ source, count, pct: visitsWithSource ? Math.round((count / visitsWithSource) * 100) : 0 }));
    const viewers = daysByUid.size;
    const returning = [...daysByUid.values()].filter(d => d.size >= 2).length;
    return {
        sources, visitsWithSource, viewers, returning,
        returningPct: viewers ? Math.round((returning / viewers) * 100) : 0,
        daysOfData: firstTracked == null ? 0 : Math.max(1, Math.ceil((nowMs - firstTracked) / 86_400_000)),
    };
}
