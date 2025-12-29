import { getApiData } from './_lib/data.js';
import { Movie } from '../types.js';

const normalizeTitle = (title: string): string => {
    if (!title) return '';
    // Strip ALL non-alphanumeric characters for strict matching
    return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        // Fetch live data from S3 with optional cache bypass
        const data = await getApiData({ noCache });

        if (data && data.movies && !noCache) {
            // ONLY perform deduplication and integrity scoring for PUBLIC requests.
            // Admin requests (noCache=true) should see every raw entry.
            const uniqueMoviesByTitle: Map<string, { movie: Movie; score: number }> = new Map();
            
            Object.values(data.movies).forEach((movie: any) => {
                const m = movie as Movie;
                if (!m || !m.title) return;

                const normTitle = normalizeTitle(m.title);
                
                // Granular Asset Integrity Score (0-100)
                let currentScore = 0;
                if (m.fullMovie && m.fullMovie.length > 10) currentScore += 40;
                if (m.poster && m.poster.length > 10) currentScore += 30;
                if (m.synopsis && m.synopsis.length > 20) currentScore += 10;
                if (m.cast && m.cast.length > 0) currentScore += 10;
                if (m.trailer && m.trailer.length > 10) currentScore += 5;
                if (m.director && m.director.length > 2) currentScore += 5;

                const existing = uniqueMoviesByTitle.get(normTitle);

                if (!existing || currentScore > existing.score) {
                    uniqueMoviesByTitle.set(normTitle, { movie: m, score: currentScore });
                }
            });

            const dedupedMovies: Record<string, Movie> = {};
            for (const item of uniqueMoviesByTitle.values()) {
                dedupedMovies[item.movie.key] = item.movie;
            }
            data.movies = dedupedMovies;
        }

        // Filter categories to ensure they don't point to now-hidden duplicates (only for public)
        if (data.categories && !noCache) {
            Object.keys(data.categories).forEach(catKey => {
                const cat = data.categories[catKey];
                if (cat.movieKeys) {
                    cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
                }
            });
        }

        // Determine cache headers based on request intent
        const cacheHeader = noCache 
            ? 'no-store, no-cache, must-revalidate, proxy-revalidate' 
            : 's-maxage=5, stale-while-revalidate=30';

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': cacheHeader,
                'Pragma': noCache ? 'no-cache' : 'auto',
                'Expires': '0'
            },
        });
    } catch (error) {
        console.error("Error in /api/get-live-data:", error);
        return new Response(JSON.stringify({ error: 'System stabilizing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}