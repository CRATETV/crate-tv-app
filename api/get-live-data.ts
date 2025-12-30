import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        // Fetch master data from S3/Firestore
        const data = await getApiData({ noCache });

        if (data && data.movies) {
            const finalMovies: Record<string, Movie> = {};
            const processedTitles = new Set<string>();
            
            // PRIORITY DEDUPLICATION: Ensure "Gemini Time Service" and "Fighter" only appear once
            const movieArray = Object.values(data.movies) as Movie[];
            
            // Sort: Movies with playable files and posters always take precedence over drafts
            movieArray.sort((a, b) => {
                const aScore = (a.fullMovie ? 10 : 0) + (a.poster ? 5 : 0);
                const bScore = (b.fullMovie ? 10 : 0) + (b.poster ? 5 : 0);
                return bScore - aScore;
            });

            movieArray.forEach((m: Movie) => {
                if (!m || !m.title || !m.key) return;
                
                const titleLower = m.title.toLowerCase().trim();
                
                // SCRUB 1: Block placeholders
                if (titleLower.includes('untitled') || titleLower === 'draft master') return;
                
                // SCRUB 2: Enforce Single-Entry for Gemini, Fighter, and all other titles
                if (processedTitles.has(titleLower)) return;
                
                processedTitles.add(titleLower);
                finalMovies[m.key] = m;
            });

            data.movies = finalMovies;
        }

        // CATEGORY SCRUBBING: Ensure no duplicate rows (like Cratemas) appear
        if (data.categories) {
            const finalCategories: Record<string, Category> = {};
            const processedRowTitles = new Set<string>();

            // System rows that are protected from deduplication logic
            const protectedKeys = ['nowStreaming', 'featured', 'publicDomainIndie'];

            Object.entries(data.categories).forEach(([key, category]) => {
                const cat = category as Category;
                if (!cat || !cat.title) return;
                
                const titleLower = cat.title.toLowerCase().trim();
                
                // If it's a duplicate row title (e.g. "Cratemas"), merge the keys and skip creating a new row
                if (processedRowTitles.has(titleLower) && !protectedKeys.includes(key)) {
                    const existingKey = Object.keys(finalCategories).find(k => finalCategories[k].title.toLowerCase().trim() === titleLower);
                    if (existingKey) {
                        const mergedKeys = Array.from(new Set([...finalCategories[existingKey].movieKeys, ...(cat.movieKeys || [])]));
                        finalCategories[existingKey].movieKeys = mergedKeys.filter(k => !!data.movies[k]);
                    }
                    return; 
                }

                if (!protectedKeys.includes(key)) {
                    processedRowTitles.add(titleLower);
                }

                // Filter out movies that were purged in the movie scrub phase
                if (Array.isArray(cat.movieKeys)) {
                    cat.movieKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);
                }
                
                finalCategories[key] = cat;
            });

            data.categories = finalCategories;
        }

        // INSTANT REFLECTION: Set cache to 0 to bypass all ISP/Browser caching for professional sync
        const cacheHeader = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': cacheHeader,
                'Pragma': 'no-cache',
                'Expires': '0'
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'System processing...' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}