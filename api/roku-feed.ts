// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data';
// FIX: Imported the Category type to ensure type safety when processing category data.
import { Movie, Category } from '../types';

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

// Helper function to process a single category into the Roku format
const processCategory = (categoryData: Category, visibleMovies: Record<string, Movie>, visibleMovieKeys: Set<string>) => {
    if (!categoryData || !Array.isArray(categoryData.movieKeys)) {
        return null;
    }

    const movies = categoryData.movieKeys
        .filter(movieKey => visibleMovieKeys.has(movieKey))
        .map(movieKey => {
            const movie = visibleMovies[movieKey];
            return {
                id: movie.key,
                title: movie.title,
                description: movie.synopsis ? movie.synopsis.replace(/<br\s*\/?>/gi, '\n').trim() : '',
                thumbnail: movie.tvPoster || movie.poster || '',
                hdThumbnail: movie.tvPoster || movie.poster || '',
                streamUrl: movie.fullMovie || '',
                director: movie.director || '',
                actors: movie.cast ? movie.cast.map(c => c.name) : [],
            };
        });
      
    if (movies.length > 0) {
        return {
            title: categoryData.title,
            movies: movies,
        };
    }
    return null;
};

export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData } = await getApiData();
    const visibleMovies = getVisibleMovies(moviesData);
    const visibleMovieKeys = new Set(Object.keys(visibleMovies));
    
    const finalCategories = [];

    // 1. Explicitly process the 'featured' category first
    const featuredCategoryData = categoriesData['featured'];
    if (featuredCategoryData) {
        const processedFeatured = processCategory(featuredCategoryData, visibleMovies, visibleMovieKeys);
        if (processedFeatured) {
            finalCategories.push(processedFeatured);
        }
    }

    // 2. Process all other categories
    Object.entries(categoriesData)
        .filter(([key]) => key !== 'featured') // Exclude the one we already processed
        .forEach(([key, categoryData]) => {
            const processedCategory = processCategory(categoryData as Category, visibleMovies, visibleMovieKeys);
            if (processedCategory) {
                finalCategories.push(processedCategory);
            }
        });

    const content = {
      categories: finalCategories,
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