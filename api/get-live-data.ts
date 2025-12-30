import { getApiData } from './_lib/data.js';
import { Movie } from '../types.js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        if (data && data.movies && !noCache) {
            const finalMovies: Record<string, Movie> = {};
            
            Object.values(data.movies).forEach((movie: any) => {
                const m = movie as Movie;
                // INCLUSIVE FILTERING: Only skip if absolutely critical ID is missing.
                // This ensures "Fighter" and other record-only films appear.
                if (!m || !m.title || !m.key) return;
                
                finalMovies[m.key] = m;
            });

            data.movies = finalMovies;
        }

        // Clean categories of orphaned keys
        if (data.categories && !noCache) {
            Object.keys(data.categories).forEach(catKey => {
                const cat = data.categories[catKey];
                if (cat && Array.isArray(cat.movieKeys)) {
                    cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
                }
            });
        }

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
        return new Response(JSON.stringify({ error: 'System stabilizing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}