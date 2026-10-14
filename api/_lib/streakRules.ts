// api/_lib/streakRules.ts
//
// Watch streaks: pure rules (tests/streaks.test.ts). Badges are for fun only:
// they never unlock films, discounts or anything paid.
//
//   • Monthly streak: watch at least one film (5+ minutes) in a calendar month.
//     Counted in Philadelphia time. The streak is still alive during a month
//     you haven't watched in yet; it breaks once a whole month is skipped.
//   • Festival streak: watch every block of a festival (5+ minutes of its
//     watch party, or of any of its films on demand).

export const WATCH_MINUTES_TO_COUNT = 5;
export const STREAK_TIME_ZONE = 'America/New_York';

/** "2026-10" for the calendar month a moment falls in (Philadelphia time). */
export function monthKey(ms: number, timeZone = STREAK_TIME_ZONE): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(new Date(ms));
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    return `${y}-${m}`;
}

function previousMonth(key: string): string {
    const [y, m] = key.split('-').map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/** Consecutive months up to now. A month not yet watched in doesn't break it. */
export function currentMonthlyStreak(months: string[], nowMs: number): number {
    const have = new Set(months);
    let key = monthKey(nowMs);
    if (!have.has(key)) key = previousMonth(key);
    let n = 0;
    while (have.has(key)) { n++; key = previousMonth(key); }
    return n;
}

export function bestMonthlyStreak(months: string[]): number {
    const sorted = [...new Set(months)].sort();
    let best = 0, run = 0, prev = '';
    for (const k of sorted) {
        run = prev && previousMonth(k) === prev ? run + 1 : 1;
        best = Math.max(best, run);
        prev = k;
    }
    return best;
}

export const MONTHLY_MILESTONES = [3, 6, 12, 24] as const;

export interface FestivalInfo { id: string; label: string; blocks: { id: string; title: string }[] }
export interface FestivalProgress { id: string; label: string; watched: number; total: number; remaining: string[]; complete: boolean }

export function festivalProgress(fest: FestivalInfo, watchedBlockIds: Set<string>): FestivalProgress {
    const remaining = fest.blocks.filter(b => !watchedBlockIds.has(b.id));
    return {
        id: fest.id, label: fest.label,
        watched: fest.blocks.length - remaining.length, total: fest.blocks.length,
        remaining: remaining.map(b => b.title),
        complete: fest.blocks.length > 0 && remaining.length === 0,
    };
}

export interface Badge { id: string; label: string; emoji: string; earnedAt: string }

/** Every badge this viewer has now earned (already-earned ones are kept as they were). */
export function earnedBadges(
    existing: Badge[],
    state: { months: string[]; festivals: FestivalProgress[] },
    nowIso: string,
): { badges: Badge[]; added: Badge[] } {
    const have = new Map(existing.map(b => [b.id, b]));
    const added: Badge[] = [];
    const give = (id: string, label: string, emoji: string) => {
        if (have.has(id)) return;
        const b = { id, label, emoji, earnedAt: nowIso };
        have.set(id, b); added.push(b);
    };
    if (state.months.length > 0) give('first-watch', 'First film on Crate TV', '🎬');
    const best = bestMonthlyStreak(state.months);
    for (const m of MONTHLY_MILESTONES) if (best >= m) give(`months-${m}`, `${m} months in a row`, m >= 12 ? '🏅' : '🔥');
    for (const f of state.festivals) if (f.complete) give(`festival-${f.id}`, `${f.label}: watched every block`, '🎟️');
    return { badges: [...have.values()], added };
}

/** One friendly nudge, or null: the festival closest to complete wins. */
export function nextNudge(festivals: FestivalProgress[]): string | null {
    const close = festivals.filter(f => !f.complete && f.watched > 0 && f.total > 1)
        .sort((a, b) => (a.total - a.watched) - (b.total - b.watched))[0];
    if (!close) return null;
    const left = close.total - close.watched;
    return left === 1
        ? `1 block left to complete your ${close.label} streak: “${close.remaining[0]}”.`
        : `${left} blocks left to complete your ${close.label} streak.`;
}

/** Festival id + label from its first screening (e.g. "PWFF 2027"). */
export function festivalIdentity(kind: 'pwff' | 'partner' | 'cratefest', name: string, firstStartMs: number | null, partnerId?: string): { id: string; label: string } {
    const year = firstStartMs ? new Date(firstStartMs).getUTCFullYear() : null;
    const base = kind === 'pwff' ? 'pwff' : kind === 'cratefest' ? 'cratefest' : `p-${partnerId}`;
    return { id: `${base}-${year ?? 'tba'}`, label: `${name}${year ? ` ${year}` : ''}` };
}
