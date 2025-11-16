// This is a Vercel Serverless Function
// It will be accessible at the path /api/instant-tv-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category } from '../types.js';

// Helper to check if a movie is released and not expired
const isMovieVisible = (movie: Movie | undefined | null): boolean => {
    if (!movie) return false;
    const now = new Date();
    
    const isReleased = !movie.releaseDateTime || new Date(movie.releaseDateTime) <= now;
    const isNotExpired = !movie.mainPageExpiry || new Date(movie.mainPageExpiry) > now;
    
    return isReleased && isNotExpired && !!movie.fullMovie;
};

// Main function to generate the Direct Publisher / Instant TV Channel feed
export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData } = await getApiData();
    
    // Create a map to associate movie keys with their genres
    const movieGenreMap = new Map<string, string[]>();
    const visibleMovies: Record<string, Movie> = {};

    Object.values(moviesData).forEach((movie: any) => {
        const m = movie as Movie;
        if (m && m.key && isMovieVisible(m)) {
            visibleMovies[m.key] = m;
            movieGenreMap.set(m.key, []);
        }
    });
    
    Object.values(categoriesData).forEach((category: any) => {
        const cat = category as Category;
        if (cat && Array.isArray(cat.movieKeys)) {
            cat.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(cat.title);
                }
            });
        }
    });
    
    // Transform the application's movie data into the format Roku requires
    const rokuCategories = Object.values(categoriesData)
      .map((category: any) => {
          const cat = category as Category;
          if (!cat || !cat.movieKeys || cat.movieKeys.length === 0) return null;

          const items = cat.movieKeys
            .map(key => visibleMovies[key])
            .filter((m): m is Movie => !!m)
            .map((movie: Movie) => {
                return {
                    title: movie.title,
                    description: movie.synopsis.replace(/<br\s*\/?>/gi, ' ').trim(),
                    streamUrl: movie.fullMovie,
                    HDPosterUrl: movie.poster,
                    genres: movieGenreMap.get(movie.key) || ['Independent'],
                    director: movie.director,
                    actors: movie.cast.map(c => c.name),
                };
            });
        
        if (items.length === 0) return null;
        
        return {
            title: cat.title,
            children: items,
        };
      })
      // FIX: The type predicate `c is object` was too generic and caused a type error. Using `NonNullable<typeof c>` provides a correct and specific type guard to filter out nulls.
      .filter((c): c is NonNullable<typeof c> => c !== null);


    return new Response(JSON.stringify(rokuCategories, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating Instant TV Channel feed:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate feed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}