import { getApiData } from './_lib/data.js';
import { Movie } from '../types.js';

const normalizeTitle = (title: string): string => {
    if (!title) return '';
    return title
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        if (data && data.movies) {
            const uniqueMoviesByTitle: Map<string, Movie> = new Map();
            Object.values(data.movies).forEach((movie: any) => {
                const m = movie as Movie;
                if (!m || !m.title) return;

                const normalizedTitle = normalizeTitle(m.title);
                const existingMovie = uniqueMoviesByTitle.get(normalizedTitle);

                /**
                 * DEDUPLICATION & SELECTION LOGIC
                 * If we find multiple versions of the same film (e.g. from pipeline errors),
                 * we keep the one that is "more complete" (has a movie URL and poster).
                 */
                if (!existingMovie) {
                    uniqueMoviesByTitle.set(normalizedTitle, m);
                } else {
                    // Check if current version is more complete than existing
                    const currentScore = (m.fullMovie ? 2 : 0) + (m.poster ? 1 : 0);
                    const existingScore = (existingMovie.fullMovie ? 2 : 0) + (existingMovie.poster ? 1 : 0);
                    
                    if (currentScore > existingScore) {
                        uniqueMoviesByTitle.set(normalizedTitle, m);
                    }
                }
            });

            const dedupedMovies: Record<string, Movie> = {};
            for (const movie of uniqueMoviesByTitle.values()) {
                dedupedMovies[movie.key] = movie;
            }
            data.movies = dedupedMovies;
        }

        // Permanently filter out Animation category until officially started
        if (data.categories) {
            if (data.categories.animation) delete data.categories.animation;
            
            // Clean up movie keys in categories to ensure no orphaned/deleted keys exist
            Object.keys(data.categories).forEach(catKey => {
                const cat = data.categories[catKey];
                if (cat.movieKeys) {
                    cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
                }
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 's-maxage=30, stale-while-revalidate=120'
            },
        });
    } catch (error) {
        console.error("Error in /api/get-live-data:", error);
        // If data fetching completely fails but we are running, the system should 
        // still function with its internal fallbacks.
        return new Response(JSON.stringify({ error: 'System processing...' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}