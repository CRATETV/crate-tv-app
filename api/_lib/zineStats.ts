// api/_lib/zineStats.ts
//
// Counting how many people read each Unpack story. The counts are for the OWNER only
// (api/admin-zine.ts action "stats" checks that), kept in their own collection so a
// writer's editor never receives them.

export const STATS_COLLECTION = 'editorial_story_stats';

/** A real story id (Firestore auto ids are 20 letters/digits). Anything odd is ignored. */
export const validStoryId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(id);

/** "2026-11-27" for a moment in time (UTC, so it is the same everywhere). */
export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

/** Reads in the last 7 days (today and the 6 days before), from a { "2026-11-27": 4, ... } map. */
export function lastSevenDays(days: Record<string, number> | undefined, now: Date): number {
    if (!days) return 0;
    let total = 0;
    for (let i = 0; i < 7; i++) {
        const k = dayKey(new Date(now.getTime() - i * 86_400_000));
        total += Number(days[k]) || 0;
    }
    return total;
}
