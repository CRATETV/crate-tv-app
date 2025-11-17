// This is a Vercel Serverless Function
// It will be accessible at the path /api/roku-direct-publisher-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

// Helper to check if a movie is released
const isMovieReleased = (movie: Movie | undefined | null): boolean => {
    if (!movie || !movie.releaseDateTime) {
        return true;
    }
    return new Date(movie.releaseDateTime) <= new Date();
};

// Main function to generate the Direct Publisher feed
export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData } = await getApiData();
    
    // Create a map to associate movie keys with their genres
    const movieGenreMap = new Map<string, string[]>();
    // FIX: Cast Object.values to Movie[] to allow accessing properties on `movie`.
    (Object.values(moviesData) as Movie[]).forEach((movie: Movie) => {
        if (movie && movie.key && isMovieReleased(movie) && movie.fullMovie) {
            movieGenreMap.set(movie.key, []);
        }
    });
    
    // FIX: Cast Object.values to Category[] and add type to `category` parameter to resolve unknown properties.
    (Object.values(categoriesData) as Category[]).forEach((category: Category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(category.title);
                }
            });
        }
    });
    
    // Transform the application's movie data into the format Roku Direct Publisher requires
    // FIX: Cast Object.values to Movie[] to resolve error on `.filter`
    const rokuMovies = (Object.values(moviesData) as Movie[])
      .filter((movie): movie is Movie => !!movie && isMovieReleased(movie) && !!movie.fullMovie)
      .map((movie: Movie) => {
        return {
          id: movie.key,
          title: movie.title,
          shortDescription: movie.synopsis.replace(/<br\s*\/?>/gi, ' ').substring(0, 200).trim() + '...',
          longDescription: movie.synopsis.replace(/<br\s*\/?>/gi, '\n').trim(),
          thumbnail: movie.poster,
          releaseDate: movie.releaseDateTime ? new Date(movie.releaseDateTime).toISOString() : new Date().toISOString(),
          genres: movieGenreMap.get(movie.key) || ['Independent'],
          tags: movieGenreMap.get(movie.key) || ['Independent'],
          credits: [
            { name: movie.director, role: 'director' },
            ...movie.cast.map(actor => ({ name: actor.name, role: 'actor' }))
          ],
          content: {
            dateAdded: movie.releaseDateTime ? new Date(movie.releaseDateTime).toISOString() : new Date().toISOString(),
            videos: [{
              url: movie.fullMovie,
              quality: 'HD',
              videoType: 'MP4'
            }],
            duration: movie.durationInMinutes ? movie.durationInMinutes * 60 : 0,
            language: "en-US"
          }
        };
      });

    // Construct the final feed object
    const feed = {
      providerName: 'Crate TV',
      lastUpdated: new Date().toISOString(),
      language: 'en-US',
      movies: rokuMovies
    };

    return new Response(JSON.stringify(feed, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating Roku Direct Publisher feed:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate feed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}