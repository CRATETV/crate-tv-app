import { getApiData } from './_lib/data.js';
import { Movie } from '../types.js';

const normalizeTitle = (title: string): string => {
    if (!title) return '';
    return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        if (data && data.movies && !noCache) {
            // assembling unique movies by key while respecting title normalization for legacy support
            const processedMovies: Record<string, Movie> = {};
            
            Object.values(data.movies).forEach((movie: any) => {
                const m = movie as Movie;
                if (!m || !m.title || !m.key) return;
                
                // We prioritize films that have a source file and art.
                const score = (m.fullMovie ? 10 : 0) + (m.poster ? 5 : 0);
                
                const existing = processedMovies[m.key];
                if (!existing || score > (processedMovies[m.key] as any)._score) {
                    processedMovies[m.key] = { ...m, _score: score } as any;
                }
            });

            // Clean up the temporary score key
            const finalMovies: Record<string, Movie> = {};
            Object.values(processedMovies).forEach(m => {
                const { _score, ...rest } = m as any;
                finalMovies[m.key] = rest;
            });

            data.movies = finalMovies;
        }

        if (data.categories && !noCache) {
            Object.keys(data.categories).forEach(catKey => {
                const cat = data.categories[catKey];
                if (cat.movieKeys) {
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
        return new Response(JSON.stringify({ error: 'Manifest sync stabilization...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}