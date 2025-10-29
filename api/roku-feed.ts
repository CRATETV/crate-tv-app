// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data';
// FIX: Import the 'Actor' and 'FilmBlock' types to correctly type cast members.
import { Movie, Category, FestivalConfig, FestivalDay, Actor, FilmBlock } from '../types';

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

export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData, festivalConfig, festivalData } = await getApiData();
    const visibleMovies = getVisibleMovies(moviesData);
    const visibleMovieKeys = new Set(Object.keys(visibleMovies));
    
    // Create a lookup map for movie genres to avoid nested loops, improving performance.
    const movieGenreMap = new Map<string, string[]>();
    Object.keys(visibleMovies).forEach(movieKey => {
        movieGenreMap.set(movieKey, []);
    });
    (Object.values(categoriesData) as Category[]).forEach((category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(category.title);
                }
            });
        }
    });

    // Helper function to process a single category into the Roku format
    const processCategory = (categoryData: Category, visibleMovies: Record<string, Movie>, visibleMovieKeys: Set<string>) => {
        if (!categoryData || !Array.isArray(categoryData.movieKeys)) {
            return null;
        }

        const movies = categoryData.movieKeys
            .filter(movieKey => visibleMovieKeys.has(movieKey))
            .map(movieKey => {
                const movie = visibleMovies[movieKey];
                // Ensure all fields are strings to prevent crashes on 'invalid' data in BrightScript
                return {
                    id: movie.key || '',
                    title: movie.title || 'Untitled Film',
                    description: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').trim(),
                    SDPosterUrl: movie.tvPoster || movie.poster || '',
                    HDPosterUrl: movie.tvPoster || movie.poster || '',
                    heroImage: movie.poster || movie.tvPoster || '',
                    streamUrl: movie.fullMovie || '',
                    director: movie.director || '',
                    // FIX: Explicitly type the 'c' parameter as 'Actor' to resolve the TypeScript inference error.
                    actors: movie.cast ? movie.cast.map((c: Actor) => c.name || '') : [],
                    genres: movieGenreMap.get(movie.key) || [],
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
    
    const finalCategories = [];

    // 1. Handle the Live Festival Category
    // If the festival is live, create a special category for it at the top.
    if (festivalConfig?.isFestivalLive && festivalData && festivalData.length > 0) {
        const festivalMovieKeys: string[] = Array.from(new Set(
            festivalData.flatMap((day: FestivalDay) => day.blocks.flatMap((block: FilmBlock) => block.movieKeys))
        ));

        const liveFestivalCategory: Category = {
            title: "Film Festival - LIVE NOW",
            movieKeys: festivalMovieKeys,
        };
        const processedLiveFestival = processCategory(liveFestivalCategory, visibleMovies, visibleMovieKeys);
        if (processedLiveFestival) {
            finalCategories.push(processedLiveFestival);
        }
    }

    // 2. Explicitly process the 'featured' category to ensure it's at the top (after festival if live).
    const featuredCategoryData = categoriesData['featured'];
    if (featuredCategoryData) {
        const processedFeatured = processCategory(featuredCategoryData, visibleMovies, visibleMovieKeys);
        if (processedFeatured) {
            finalCategories.push(processedFeatured);
        }
    }

    // 3. Process all other categories
    Object.entries(categoriesData)
        // Exclude the ones we already processed or don't want
        .filter(([key]) => {
            const isFeatured = key === 'featured';
            // If the festival is live, also exclude the standard PWFF category to avoid duplicates
            const isRedundantFestivalCategory = festivalConfig?.isFestivalLive && key === 'pwff12thAnnual';
            return !isFeatured && !isRedundantFestivalCategory;
        })
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