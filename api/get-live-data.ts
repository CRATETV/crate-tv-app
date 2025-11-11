// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-live-data
import { getApiData } from './_lib/data.js';
import { Movie } from '../types.js';

// More robust title normalization and typo correction
const normalizeTitle = (title: string): string => {
    if (!title) return '';
    let normalized = title
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim()
        .toLowerCase();
    
    // Specific fix for the user's reported issue
    if (normalized.startsWith('gemeni time service')) {
        normalized = normalized.replace('gemeni', 'gemini');
    }
    return normalized;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        // --- START OF DEDUPLICATION LOGIC ---
        if (data && data.movies) {
            const uniqueMoviesByTitle: Map<string, Movie> = new Map();
            Object.values(data.movies).forEach((movie: any) => {
                const m = movie as Movie;
                if (!m || !m.title) return;

                const normalizedTitle = normalizeTitle(m.title);
                const existingMovie = uniqueMoviesByTitle.get(normalizedTitle);

                if (!existingMovie) {
                    uniqueMoviesByTitle.set(normalizedTitle, m);
                } else {
                    // Prioritize entry with a full movie URL to ensure functionality
                    if (m.fullMovie && !existingMovie.fullMovie) {
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
        // --- END OF DEDUPLICATION LOGIC ---


        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // Cache on the edge for 1 minute, allow stale for 5 minutes
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            },
        });
    } catch (error) {
        console.error("Error in /api/get-live-data:", error);
        return new Response(JSON.stringify({ error: 'Failed to fetch application data.' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}