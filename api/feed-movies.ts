// api/feed-movies.ts

// This is a Vercel Serverless Function
// It will be accessible at the path /api/feed-movies

import { moviesData, categoriesData, Category } from './_lib/data.ts';

// Helper to determine genre from categories
const getGenres = (movieKey: string, allCategories: Record<string, Category>): string[] => {
    const genres = new Set<string>();
    if (allCategories.drama?.movieKeys.includes(movieKey)) genres.add('drama');
    if (allCategories.comedy?.movieKeys.includes(movieKey)) genres.add('comedy');
    if (allCategories.documentary?.movieKeys.includes(movieKey)) genres.add('documentary');
    
    // Fallback genre if none of the main ones match
    if (genres.size === 0) {
        genres.add('short');
    }

    return Array.from(genres);
}


export async function GET(request: Request) {
    try {
        const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, ' ') : '';

        const allMovieFeedObjects = Object.values(moviesData).map(movie => {
            const longDescription = stripHtml(movie.synopsis);
            const shortDescription = longDescription.length > 200 
                ? longDescription.substring(0, 197) + '...' 
                : longDescription;

            const tags = Object.values(categoriesData)
                .filter(cat => cat.movieKeys.includes(movie.key))
                .map(cat => cat.title);
            
            const credits = movie.cast.map(actor => ({ name: actor.name, role: 'actor' }));
            
            // Handle single or multiple directors
            if (movie.director) {
              const directors = movie.director.split(',').map(d => d.trim());
              directors.forEach(director => {
                  if(director) credits.push({ name: director, role: 'director' });
              });
            }
            
            let duration = 600; // Default 10 mins
            if (movie.key === 'streeteatstheboot') {
                duration = 3240; // Specific duration for this documentary
            }

            return {
                id: movie.key,
                title: movie.title,
                shortDescription,
                longDescription,
                thumbnail: movie.poster,
                releaseDate: movie.releaseDate || '2024-01-01',
                genres: getGenres(movie.key, categoriesData),
                tags,
                credits,
                content: {
                    dateAdded: `${movie.releaseDate || '2024-01-01'}T00:00:00Z`,
                    videos: [{ 
                        url: movie.fullMovie, 
                        quality: "HD", 
                        videoType: "MP4" 
                    }],
                    duration: duration,
                    language: "en-US"
                }
            };
        });

        const moviesMap = new Map(allMovieFeedObjects.map(m => [m.id, m]));

        const categories = Object.values(categoriesData)
            .filter(cat => cat.movieKeys.length > 0)
            .map(cat => ({
                name: cat.title,
                playlist: cat.movieKeys
                    .map(key => moviesMap.get(key))
                    .filter(Boolean) // Filter out any potential undefined movies
            }));

        const feed = {
            providerName: "Crate TV",
            lastUpdated: new Date().toISOString(),
            language: "en-US",
            movies: allMovieFeedObjects, // Keep the flat list for search/lookup
            categories
        };

        return new Response(JSON.stringify(feed, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error generating movies feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return new Response(JSON.stringify({ error: `Failed to generate feed: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
