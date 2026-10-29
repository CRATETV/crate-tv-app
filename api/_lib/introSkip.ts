// api/_lib/introSkip.ts — the "Skip intro" button for series episodes (Oct 29 2026).
//
// A series can say where its intro ends (introEnd, seconds), and an episode
// can say its own. The button shows from introStart (default 0) until the
// intro ends, then disappears. Nothing set = no button.
//
// Tested: tests/introSkip.test.ts.

export interface IntroWindow { start: number; end: number }

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/** The intro window for an episode: its own times if it has an end, else the series' ones. */
export function introWindow(
    series: { introStart?: number; introEnd?: number } | null | undefined,
    episode: { introStart?: number; introEnd?: number } | null | undefined,
): IntroWindow | null {
    const own = num(episode?.introEnd);
    const src = own != null && own > 0 ? episode : series;
    const end = num(src?.introEnd);
    if (end == null || end <= 0) return null;
    const start = num(src?.introStart) ?? 0;
    return start < end ? { start, end } : null;
}

/** Show the button at this moment of the episode? (Not in the last second, so it doesn't flash.) */
export function inIntro(win: IntroWindow | null, seconds: number): boolean {
    return !!win && Number.isFinite(seconds) && seconds >= win.start && seconds < win.end - 1;
}
