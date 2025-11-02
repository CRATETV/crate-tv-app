// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category, FestivalConfig } from '../types.js';

interface RokuMovie {
    id: string;
    title: string;
    description: string;
    SDPosterUrl: string;
    HDPosterUrl: string;
    heroImage: string;
    streamUrl: string;
    director: string;
    actors: string[];
    genres: string[];
    rating: string;
    duration: string;
}

interface RokuCategory {
    title: string;
    children: (RokuMovie | null)[];
}


const getVisibleMovies = (moviesData: Record<string, Movie>): Record<string, Movie> => {
    const visibleMovies: Record<string, Movie> = {};
    const now = new Date();

    Object.values(moviesData).forEach((movie: Movie) => {
      if (!movie) return; // Add a guard for safety
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

const formatMovieForRoku = (movie: Movie, movieGenreMap: Map<string, string[]>): RokuMovie | null => {
    if (!movie) return null;
    // Ensure all fields are strings or arrays of strings to prevent crashes on 'invalid' data in BrightScript
    return {
        id: movie.key || '',
        title: movie.title || 'Untitled Film',
        description: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').trim(),
        SDPosterUrl: movie.tvPoster || movie.poster || '',
        HDPosterUrl: movie.tvPoster || movie.poster || '',
        heroImage: movie.poster || movie.tvPoster || '', // Use main poster for hero
        streamUrl: movie.fullMovie || '',
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: movieGenreMap.get(movie.key) || [],
        rating: movie.rating ? movie.rating.toFixed(1) : "",
        duration: movie.durationInMinutes ? `${movie.durationInMinutes} min` : "",
    };
};

export async function GET(request: Request) {
  try {
    const { movies: moviesData, categories: categoriesData, festivalConfig } = await getApiData();
    const visibleMovies = getVisibleMovies(moviesData);
    
    const movieGenreMap = new Map<string, string[]>();
    Object.keys(visibleMovies).forEach((key: string) => {
        movieGenreMap.set(key, []);
    });

    (Object.values(categoriesData) as Category[]).forEach((category: Category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach((movieKey: string) => {
                if (movieGenreMap.has(movieKey)) {
                    movieGenreMap.get(movieKey)?.push(category.title);
                }
            });
        }
    });
    
    // 1. Get Hero Items from 'featured' category
    const heroItems = (categoriesData['featured']?.movieKeys || [])
        .map((key: string) => visibleMovies[key])
        .filter((movie): movie is Movie => !!movie)
        .map((movie: Movie) => formatMovieForRoku(movie, movieGenreMap));
        
    // Helper function to process a single category into the Roku format
    const processCategory = (categoryData: Category): RokuCategory | null => {
        if (!categoryData || !Array.isArray(categoryData.movieKeys)) {
            return null;
        }
        const movies = categoryData.movieKeys
            .map((movieKey: string) => visibleMovies[movieKey])
            .filter((movie): movie is Movie => !!movie)
            .map((movie: Movie) => formatMovieForRoku(movie, movieGenreMap));
          
        if (movies.length > 0) {
            return {
                title: categoryData.title,
                children: movies, // Roku RowList content nodes use 'children'
            };
        }
        return null;
    };
    
    // 2. Get Top 10 Movies
    const topTenMovies = Object.values(visibleMovies)
        .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
        .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);
    const topTenCategory: Category | null = topTenMovies.length > 0 ? {
        title: "Top 10 on Crate TV Today",
        movieKeys: topTenMovies.map((m: Movie) => m.key)
    } : null;

    // 3. Get Now Playing Movie
    const nowPlayingMovie = visibleMovies['consumed'];
    const nowPlayingCategory: Category | null = nowPlayingMovie ? {
        title: "Now Playing",
        movieKeys: ['consumed']
    } : null;

    // 4. Handle Live Festival
    const isFestivalLive = festivalConfig?.startDate && festivalConfig?.endDate && 
                           new Date() >= new Date(festivalConfig.startDate) && 
                           new Date() < new Date(festivalConfig.endDate);
    const liveFestivalCategory: Category | null = (isFestivalLive && categoriesData['pwff12thAnnual']) ? {
        title: "Film Festival - LIVE NOW",
        movieKeys: categoriesData['pwff12thAnnual'].movieKeys,
    } : null;

    // 5. Assemble categories in order
    const finalCategories: RokuCategory[] = [];
    const orderedCategories: (Category | null)[] = [
        liveFestivalCategory,
        nowPlayingCategory,
        topTenCategory,
    ];

    const processedKeys = new Set(['featured', 'pwff12thAnnual', 'consumed']);
    const remainingCategoryOrder = ["newReleases", "awardWinners", "comedy", "drama", "documentary", "exploreTitles", "publicDomainIndie"];
    
    remainingCategoryOrder.forEach((key: string) => {
        if (!processedKeys.has(key) && categoriesData[key]) {
            orderedCategories.push(categoriesData[key]);
        }
    });
    
    orderedCategories.forEach((cat: Category | null) => {
        if (cat) {
            const processed = processCategory(cat);
            if (processed) {
                finalCategories.push(processed);
            }
        }
    });

    const content = {
      heroItems: heroItems,
      categories: finalCategories,
    };

    return new Response(JSON.stringify(content, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=600, stale-while-revalidate', // Cache for 10 minutes
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