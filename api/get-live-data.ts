import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });

        if (data && data.movies) {
            const finalMovies: Record<string, Movie> = {};
            const processedTitles = new Set<string>();
            
            // DEDUPLICATION ENGINE: Prioritize movies with full content
            const movieArray = Object.values(data.movies) as Movie[];
            
            // Sort so movies with a fullMovie URL come first
            movieArray.sort((a, b) => {
                if (a.fullMovie && !b.fullMovie) return -1;
                if (!a.fullMovie && b.fullMovie) return 1;
                return 0;
            });

            movieArray.forEach((m: Movie) => {
                if (!m || !m.title || !m.key) return;
                
                const titleLower = m.title.toLowerCase().trim();
                
                // SCRUB 1: Remove "Untitled" or "Draft" placeholder entries
                if (titleLower.includes('untitled') || titleLower === 'draft master') return;
                
                // SCRUB 2: Deduplicate "Fighter", "Gemini Time Service", etc.
                if (processedTitles.has(titleLower)) return;
                
                processedTitles.add(titleLower);
                finalMovies[m.key] = m;
            });

            data.movies = finalMovies;
        }

        // CATEGORY SCRUBBING: Remove duplicate rows and orphaned keys
        if (data.categories) {
            const finalCategories: Record<string, Category> = {};
            const processedCatTitles = new Set<string>();

            Object.entries(data.categories).forEach(([key, category]) => {
                const cat = category as Category;
                if (!cat || !cat.title) return;
                
                const titleLower = cat.title.toLowerCase().trim();
                
                // Merge or Skip duplicate row titles (e.g., Cratemas)
                if (processedCatTitles.has(titleLower) && key !== 'featured' && key !== 'nowStreaming') {
                    return; 
                }

                processedCatTitles.add(titleLower);

                // Filter out movies that were scrubbed
                if (Array.isArray(cat.movieKeys)) {
                    cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
                }
                
                finalCategories[key] = cat;
            });

            data.categories = finalCategories;
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