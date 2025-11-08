// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category, FestivalConfig, FestivalDay, FilmBlock } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

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
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    let isDeviceLinked = false;
    if (deviceId) {
        const initError = getInitializationError();
        const db = getAdminDb();
        if (!initError && db) {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            isDeviceLinked = linkDoc.exists;
        }
    }

    const { movies: moviesData, categories: categoriesData, festivalConfig, festivalData } = await getApiData();
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
    
    const heroMovieKeys: string[] = categoriesData['featured']?.movieKeys || [];
    const heroMovieObjects: (Movie | undefined)[] = heroMovieKeys.map((key: string) => visibleMovies[key]);
    const validHeroMovies: Movie[] = heroMovieObjects.filter((movie): movie is Movie => !!movie);
    const heroItems = validHeroMovies.map((movie: Movie) => formatMovieForRoku(movie, movieGenreMap));
        
    const processCategory = (categoryData: Category): RokuCategory | null => {
        if (!categoryData || !Array.isArray(categoryData.movieKeys)) return null;
        const movieObjects = categoryData.movieKeys.map((movieKey: string) => visibleMovies[movieKey]);
        const validMovies = movieObjects.filter((movie): movie is Movie => !!movie);
        const rokuMovies = validMovies.map((movie: Movie) => formatMovieForRoku(movie, movieGenreMap));
        if (rokuMovies.length > 0) return { title: categoryData.title, children: rokuMovies };
        return null;
    };
    
    const allVisibleMovies: Movie[] = Object.values(visibleMovies);
    const moviesWithLikes: Movie[] = [];
    for (const movie of allVisibleMovies) {
        if (movie && typeof movie.likes === 'number') {
            moviesWithLikes.push(movie);
        }
    }
    const sortedMovies = moviesWithLikes.sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0));
    const topTenMovies = sortedMovies.slice(0, 10);

    const topTenCategory: Category | null = topTenMovies.length > 0 ? {
        title: "Top 10 on Crate TV Today",
        movieKeys: topTenMovies.map((m: Movie) => m.key)
    } : null;

    const nowPlayingMovie = visibleMovies['consumed'];
    const nowPlayingCategory: Category | null = nowPlayingMovie ? {
        title: "Now Playing",
        movieKeys: ['consumed']
    } : null;

    const isFestivalLive = festivalConfig?.startDate && festivalConfig?.endDate && 
                           new Date() >= new Date(festivalConfig.startDate) && 
                           new Date() < new Date(festivalConfig.endDate);
                           
    const festivalCategories: Category[] = [];
    if (isFestivalLive && festivalData) {
        festivalData.forEach((day: FestivalDay) => {
            day.blocks.forEach((block: FilmBlock) => {
                festivalCategories.push({ title: `Day ${day.day}: ${block.title}`, movieKeys: block.movieKeys });
            });
        });
    }

    // --- Add Account Linking Category ---
    const accountCategory: RokuCategory = {
        title: "My Account",
        children: [{
            id: "link_account_action", // Special ID for the Roku app to identify this action
            title: isDeviceLinked ? "Account Linked" : "Link This Device",
            description: isDeviceLinked 
                ? "Your Crate TV account is linked to this Roku device. Your purchases will be synced." 
                : "Link your Crate TV account to sync purchases and unlock content. Select this item to get your unique link code.",
            SDPosterUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed.png",
            HDPosterUrl: "https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed.png",
            heroImage: "", streamUrl: "", director: "", actors: [], genres: [], rating: "", duration: ""
        }]
    };

    const finalCategories: RokuCategory[] = [accountCategory];
    const orderedCategories: (Category | null)[] = [
        ...festivalCategories,
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
        'Cache-Control': 's-maxage=600, stale-while-revalidate',
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