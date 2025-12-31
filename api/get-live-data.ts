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
            const processedFingerprints = new Set<string>();
            
            const movieArray = Object.values(data.movies) as Movie[];
            
            movieArray.sort((a, b) => {
                const aScore = (a.fullMovie ? 100 : 0) + (a.poster ? 50 : 0) + (a.synopsis?.length > 10 ? 10 : 0);
                const bScore = (b.fullMovie ? 100 : 0) + (b.poster ? 50 : 0) + (b.synopsis?.length > 10 ? 10 : 0);
                return bScore - aScore;
            });

            movieArray.forEach((m: Movie) => {
                if (!m || !m.title || !m.key) return;
                
                const fingerprint = m.title
                    .toLowerCase()
                    .replace(/gemeni/g, 'gemini')
                    .replace(/[^a-z0-9]/g, '')
                    .trim();
                
                if (fingerprint.includes('untitled') || fingerprint === 'draftmaster') return;
                if (processedFingerprints.has(fingerprint)) return;
                
                processedFingerprints.add(fingerprint);
                finalMovies[m.key] = m;
            });

            data.movies = finalMovies;
        }

        if (data.categories) {
            const finalCategories: Record<string, Category> = {};
            const processedRowFingerprints = new Set<string>();
            const protectedKeys = ['nowStreaming', 'featured', 'publicDomainIndie'];

            Object.entries(data.categories).forEach(([key, category]) => {
                const cat = category as Category;
                if (!cat || !cat.title) return;
                
                const fingerprint = cat.title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                
                // Merge duplicate rows if they appear due to sync issues
                if (processedRowFingerprints.has(fingerprint) && !protectedKeys.includes(key)) {
                    const existingKey = Object.keys(finalCategories).find(k => 
                        finalCategories[k].title.toLowerCase().replace(/[^a-z0-9]/g, '').trim() === fingerprint
                    );
                    if (existingKey) {
                        const mergedKeys = Array.from(new Set([...finalCategories[existingKey].movieKeys, ...(cat.movieKeys || [])]));
                        finalCategories[existingKey].movieKeys = mergedKeys.filter(k => !!data.movies[k]);
                    }
                    return; 
                }

                if (!protectedKeys.includes(key)) processedRowFingerprints.add(fingerprint);
                
                if (Array.isArray(cat.movieKeys)) {
                    // Filter out deleted movies
                    let validKeys = cat.movieKeys.filter((k: string) => !!data.movies[k]);

                    // GLOBAL SORTING: Put newest movies at the front for EVERY category
                    validKeys.sort((a, b) => {
                        const movieA = data.movies[a];
                        const movieB = data.movies[b];
                        
                        // Fallback order: releaseDateTime -> publishedAt -> 0
                        const dateA = new Date(movieA.releaseDateTime || movieA.publishedAt || 0).getTime();
                        const dateB = new Date(movieB.releaseDateTime || movieB.publishedAt || 0).getTime();
                        
                        return dateB - dateA; // Descending (Newest first)
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
                'Cache-Control': noCache ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' : 'public, s-maxage=1, stale-while-revalidate=5',
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