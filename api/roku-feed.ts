// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data.ts';
// FIX: Imported the Category type to ensure type safety when processing category data.
import { Movie, Category } from '../types.ts';

const getVisibleMovies = (moviesData: Record<string, Movie>): Record<string, Movie> => {
    const visibleMovies: Record<string, Movie> = {};
    const today = new Date();

    Object.values(moviesData).forEach(movie => {
      // FIX: Changed movie.releaseDate to movie.releaseDateTime to match the data structure.
      if (!movie.releaseDateTime || new Date(movie.releaseDateTime) <= today) {
        visibleMovies[movie.key] = movie;
      }
    });
    return visibleMovies;
};

export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData } = await getApiData();
    const visibleMovies = getVisibleMovies(moviesData);
    const visibleMovieKeys = new Set(Object.keys(visibleMovies));

    const content = {
      categories: Object.entries(categoriesData)
        .filter(([key]) => key !== 'featured')
        .map(([key, categoryData]) => {
          const cat = categoryData as Category;

          // Add a guard to prevent crashes if a category is null or malformed.
          if (!cat || !Array.isArray(cat.movieKeys)) {
            return null;
          }

          const movies = cat.movieKeys
            .filter(movieKey => visibleMovieKeys.has(movieKey))
            .map(movieKey => {
              const movie = visibleMovies[movieKey];
              return {
                id: movie.key,
                title: movie.title,
                description: movie.synopsis.replace(/<br\s*\/?>/gi, '\n').trim(),
                thumbnail: movie.tvPoster || movie.poster, // Prioritize portrait TV poster
                hdThumbnail: movie.tvPoster || movie.poster,
                streamUrl: movie.fullMovie,
                director: movie.director,
                actors: movie.cast.map(c => c.name),
              };
            });
          
          if (movies.length > 0) {
            return {
              title: cat.title,
              movies: movies,
            };
          }
          return null;
        })
        .filter(Boolean),
    };

    return new Response(JSON.stringify(content, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Roku feed:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate feed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}