// This is a Vercel Serverless Function
// It will be accessible at the path /api/roku-movie-details

import { getApiData } from './_lib/data.ts';
import { Movie, Category } from '../types.ts';

// Helper function to format a single movie for Roku
const formatMovieForRoku = (movie: Movie, categoriesData: Record<string, Category>) => {
    const genres = Object.values(categoriesData)
        .filter(cat => cat && Array.isArray(cat.movieKeys) && cat.movieKeys.includes(movie.key))
        .map(cat => cat.title);

    // Ensure all fields are strings to prevent crashes on 'invalid' data in BrightScript
    return {
        id: movie.key || '',
        title: movie.title || 'Untitled Film',
        description: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').trim(),
        SDPosterUrl: movie.tvPoster || movie.poster || '',
        HDPosterUrl: movie.tvPoster || movie.poster || '',
        streamUrl: movie.fullMovie || '',
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: genres,
    };
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const movieId = url.searchParams.get('id');

    if (!movieId) {
      return new Response(JSON.stringify({ error: 'Movie ID is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { movies: moviesData, categories: categoriesData } = await getApiData();
    const movie = moviesData[movieId];

    if (!movie) {
      return new Response(JSON.stringify({ error: 'Movie not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const rokuMovie = formatMovieForRoku(movie, categoriesData);

    return new Response(JSON.stringify(rokuMovie, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating Roku movie details:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate movie details.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}