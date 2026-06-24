import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

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
                // NOTE: fullMovie is included here as a fallback for the video player.
                // The primary secure path is /api/get-stream-url which verifies
                // Firebase auth + payment before returning a signed expiring URL.
                // CloudFront signed URL enforcement means fullMovie URLs require
                // a valid signature anyway, so exposure here is low risk.
                finalMovies[m.key] = m;
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
