// api/feed-movies.ts

// This is a Vercel Serverless Function using the Node.js runtime.
// It will be accessible at the path /api/feed-movies
import { moviesData, categoriesData } from '../constants.ts';
import type { Category } from '../types.ts';

// Helper to determine genre from categories based on the Direct Publisher specification.
const getGenres = (movieKey: string, allCategories: Record<string, Category>): string[] => {
    const genres = new Set<string>();
    // Valid genres from the DP spec.
    if (allCategories.drama?.movieKeys.includes(movieKey)) genres.add('drama');
    if (allCategories.comedy?.movieKeys.includes(movieKey)) genres.add('comedy');
    if (allCategories.documentary?.movieKeys.includes(movieKey)) genres.add('documentary');
    
    // Fallback genre if none of the main ones match. 'special_interest' is a valid genre.
    if (genres.size === 0) {
        genres.add('special_interest');
    }

    return Array.from(genres);
}


export default function handler(req: any, res: any) {
    try {
        const stripHtml = (html: string) => html ? html.replace(/<[^>]*>?/gm, ' ') : '';

        const allMovieFeedObjects = Object.values(moviesData).map(movie => {
            const synopsisText = stripHtml(movie.synopsis);
            const shortDescription = synopsisText.length > 200 
                ? synopsisText.substring(0, 197) + '...' 
                : synopsisText;
            
            // Defensively truncate long description to a max of 1400 chars.
            const longDescription = synopsisText.substring(0, 1400);

            const tags = Object.values(categoriesData)
                .filter(cat => cat.movieKeys.includes(movie.key))
                .map(cat => cat.title);
            
            const credits = movie.cast.map(actor => ({ name: actor.name, role: 'actor' }));
            
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
                thumbnail: movie.tvPoster || movie.poster,
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

        // The key MUST be 'playlists' according to the Direct Publisher Spec.
        const playlists = Object.values(categoriesData)
            .filter(cat => cat.movieKeys.length > 0)
            .map(cat => ({
                name: cat.title,
                 // The playlist should contain the IDs of the content items
                playlist: cat.movieKeys.filter(key => moviesData[key]),
            }));

        const feed = {
            providerName: "Crate TV",
            lastUpdated: new Date().toISOString(),
            language: "en-US",
            // The content type key MUST be 'shortFormVideos' for short films.
            shortFormVideos: allMovieFeedObjects, 
            playlists // This key was 'categories' and is now corrected to 'playlists'.
        };
        
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
        res.status(200).json(feed);

    } catch (error) {
        console.error('Error generating movies feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: `Failed to generate feed: ${errorMessage}` });
    }
}