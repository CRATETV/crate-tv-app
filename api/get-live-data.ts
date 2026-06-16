import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

// Fields that must NEVER be sent to the client in the public catalog response.
// These are raw S3/CloudFront URLs — anyone who gets them can watch films for free.
// The only way to get a playable URL is through /api/get-stream-url, which
// verifies Firebase auth + payment server-side before returning a signed URL.
const SENSITIVE_FIELDS = [
    'fullMovie',
    'streamUrl',
    'rokuStreamUrl',
    'liveStreamUrl',
    'watchPartyIntroVideoUrl',
    'subtitleUrl',
] as const;

function stripSensitiveFields(movie: Movie): Movie {
    const safe: any = { ...movie };
    for (const field of SENSITIVE_FIELDS) {
        delete safe[field];
    }
    return safe as Movie;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        if (data && data.movies) {
            const finalMovies: Record<string, Movie> = {};
            const movieArray = Object.values(data.movies) as Movie[];
            
            movieArray.forEach((m: Movie) => {
                if (!m || !m.title || !m.key) return;
                // Strip all video URLs — clients must use /api/get-stream-url instead
                finalMovies[m.key] = stripSensitiveFields(m);
            });

            data.movies = finalMovies;
        }

        if (data.categories) {
            const finalCategories: Record<string, Category> = {};
            Object.entries(data.categories).forEach(([key, category]) => {
                const cat = category as Category;
                if (!cat || !cat.title) return;
                if (Array.isArray(cat.movieKeys)) {
                    cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
                }
                finalCategories[key] = cat;
            });
            data.categories = finalCategories;
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Manifest re-syncing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
