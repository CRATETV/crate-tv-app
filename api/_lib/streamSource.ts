// api/_lib/streamSource.ts — which file get-stream-url signs.
//
// A film plays its own file (fullMovie). A series' episode plays that
// episode's file (Oct 29 2026): the browser is never sent a paid series'
// episode links, so it asks for "episode 3" by number and the server signs
// that one after the usual access check.
//
// Tested: tests/streamSource.test.ts.

export function pickStreamSource(
    movie: { fullMovie?: string; isSeries?: boolean; episodes?: { url?: string }[] } | null | undefined,
    episode: unknown,
): { url?: string; error?: 'no-such-episode' } {
    if (episode === undefined || episode === null) return { url: movie?.fullMovie };
    if (!movie?.isSeries || !Array.isArray(movie.episodes)) return { error: 'no-such-episode' };
    if (typeof episode !== 'number' || !Number.isInteger(episode) || episode < 0 || episode >= movie.episodes.length) return { error: 'no-such-episode' };
    return { url: movie.episodes[episode]?.url };
}
