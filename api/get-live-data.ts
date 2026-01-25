import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        // Fetch fresh data from S3, bypassing any server-side cache if noCache is true
        const data = await getApiData({ noCache });

        if (data && data.movies) {
            const finalMovies: Record<string, Movie> = {};
            
            const movieArray = Object.values(data.movies) as Movie[];
            
            // Prioritize movies with assets for the manifest
            movieArray.sort((a, b) => {
                const aScore = (a.fullMovie ? 100 : 0) + (a.poster ? 50 : 0) + (a.synopsis?.length > 10 ? 10 : 0);
                const bScore = (b.fullMovie ? 100 : 0) + (b.poster ? 50 : 0) + (b.synopsis?.length > 10 ? 10 : 0);
                return bScore - aScore;
            });

            movieArray.forEach((m: Movie) => {
                if (!m || !m.title || !m.key) return;
                
                const lowerTitle = m.title.toLowerCase().trim();
                
                // CORE FIX: Removed title-based fingerprinting.
                // We strictly rely on the unique database key to determine uniqueness.
                // This allows movies like "Just Cuz" to exist in the global catalog even 
                // if other nodes share common keywords in metadata.
                if (lowerTitle === '' || (lowerTitle === 'untitled' && m.key.startsWith('movie_'))) return;
                
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
                    // Only include movies that survived the drafting filter
                    let validKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);

                    // Primary sorting by release date within categories
                    validKeys.sort((a, b) => {
                        const movieA = data.movies[a];
                        const movieB = data.movies[b];
                        const dateA = new Date(movieA.releaseDateTime || movieA.publishedAt || 0).getTime();
                        const dateB = new Date(movieB.releaseDateTime || movieB.publishedAt || 0).getTime();
                        return dateB - dateA; 
                    });

                    cat.movieKeys = validKeys;
                }
                finalCategories[key] = cat;
            });

            data.categories = finalCategories;
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // CRITICAL: Force non-cacheable response headers to ensure instant propagation of manifest updates
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store',
                'X-Crate-Version': Date.now().toString()
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Manifest re-syncing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}