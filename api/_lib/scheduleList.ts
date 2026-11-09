// Which rows the "Schedule a watch party" list shows up front.
//
// The list has every film and block in the catalog, so it gets very long.
// By default we show only what matters right now:
//   • anything switched ON (so nothing live is ever hidden), and
//   • anything with a start time that hasn't passed yet (or passed within the
//     last 12 hours, so tonight's party doesn't vanish the moment it starts).
// Everything else sits behind a "Show all" arrow. Typing in the filter box
// searches everything, so any film can still be found.

export const RECENT_MS = 12 * 60 * 60 * 1000;

interface ScheduleItem {
    title: string;
    isWatchPartyEnabled?: boolean;
    watchPartyStartTime?: string;
}

const startMs = (item: ScheduleItem): number | null => {
    if (!item.watchPartyStartTime) return null;
    const t = new Date(item.watchPartyStartTime).getTime();
    return Number.isFinite(t) ? t : null;
};

export function splitSchedule<T extends ScheduleItem>(items: T[], nowMs: number): { upcoming: T[]; rest: T[] } {
    const upcoming: T[] = [];
    const rest: T[] = [];
    for (const item of items) {
        const t = startMs(item);
        const soon = t !== null && t >= nowMs - RECENT_MS;
        (item.isWatchPartyEnabled || soon ? upcoming : rest).push(item);
    }
    // Soonest first; ones with no time yet go after, A to Z.
    upcoming.sort((a, b) => {
        const ta = startMs(a), tb = startMs(b);
        if (ta !== null && tb !== null) return ta - tb;
        if (ta !== null) return -1;
        if (tb !== null) return 1;
        return a.title.localeCompare(b.title);
    });
    rest.sort((a, b) => a.title.localeCompare(b.title));
    return { upcoming, rest };
}
