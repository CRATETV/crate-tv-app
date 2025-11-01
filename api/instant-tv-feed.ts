// This is a Vercel Serverless Function that generates a feed for Instant TV Channel.
// It will be accessible at the path /api/instant-tv-feed

import { getApiData } from './_lib/data.js';
// FIX: Imported the Category type to ensure type safety when processing category data.
import { Movie, Category } from '../types.js';

// Helper function to get movies that are currently released
const getVisibleMovies = (moviesData: Record<string, Movie>): Record<string, Movie> => {
    const visibleMovies: Record<string, Movie> = {};
    const now = new Date();

    Object.values(moviesData).forEach(movie => {
      const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
      const expiryDate = movie.mainPageExpiry ? new Date(movie.mainPageExpiry) : null;
      
      const isReleased = !releaseDate || releaseDate <= now;
      const isNotExpired = !expiryDate || expiryDate > now;

      if (isReleased && isNotExpired) {
        visibleMovies[movie.key] = movie;
      }
    });
    return visibleMovies;
};

// Main function to handle the GET request
export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData } = await getApiData();
    const visibleMovies = getVisibleMovies(moviesData);
    const visibleMovieKeys = new Set(Object.keys(visibleMovies));

    // Create a lookup map for movie genres to avoid nested loops, improving performance.
    const movieGenreMap = new Map<string, string[]>();
    Object.keys(visibleMovies).forEach(movieKey => {
        movieGenreMap.set(movieKey, []);
    });
    // FIX: Cast the result of Object.values to ensure the 'category' parameter is correctly typed.
    (Object.values(categoriesData) as Category[]).forEach((category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(category.title);
                }
            });
        }
    });

    // Transform categories and their movies into the Instant TV Channel format
    const categories = Object.entries(categoriesData)
      .filter(([key]) => key !== 'featured') // Exclude the web-only 'featured' category
      .map(([key, categoryData]) => {
        const catData = categoryData as Category;
        
        // Add a guard to prevent crashes if a category is null or malformed.
        if (!catData || !Array.isArray(catData.movieKeys)) {
            return null;
        }
        
        const playlist = catData.movieKeys
          .filter(movieKey => visibleMovieKeys.has(movieKey))
          .map(movieKey => {
            const movie = visibleMovies[movieKey];

            return {
              title: movie.title,
              // Instant TV requires both short and long descriptions
              shortdescription: movie.synopsis ? movie.synopsis.replace(/<br\s*\/?>/gi, ' ').substring(0, 200).trim() : '',
              longdescription: movie.synopsis ? movie.synopsis.replace(/<br\s*\/?>/gi, '\n').trim() : '',
              thumbnail: movie.tvPoster || movie.poster || '',
              // Instant TV uses a 'stream' object for video URLs
              stream: {
                url: movie.fullMovie || '',
                bitrate: 1500, // Example bitrate, can be adjusted
                quality: "HD"
              },
              streamformat: "mp4",
              genres: movieGenreMap.get(movie.key) || [],
              credits: [
                { name: movie.director || '', role: "director" },
                ...(movie.cast ? movie.cast.map(c => ({ name: c.name, role: "actor" })) : [])
              ]
            };
          });

        // Only include the category in the final feed if it has visible movies
        if (playlist.length > 0) {
          return {
            name: catData.title,
            playlist: playlist,
          };
        }
        return null;
      })
      .filter(Boolean); // Filter out any empty categories

    // Assemble the final feed object
    const feed = {
      providerName: "Crate TV",
      lastUpdated: new Date().toISOString(),
      language: "en-US",
      categories: categories,
    };

    return new Response(JSON.stringify(feed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating Instant TV feed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: `Failed to generate feed: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}