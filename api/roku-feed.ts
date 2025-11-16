// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category, FestivalConfig, FestivalDay, FilmBlock, User } from '../types.js';
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
    isLiked: boolean;
    isOnWatchlist: boolean;
    isWatched: boolean;
    itemComponentName?: string;
}

interface RokuCategory {
    title: string;
    children: (RokuMovie | null)[];
    itemComponentName?: string;
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

const formatMovieForRoku = (movie: Movie, movieGenreMap: Map<string, string[]>, user: User | null): RokuMovie | null => {
    if (!movie) return null;
    return {
        id: movie.key || '',
        title: movie.title || 'Untitled Film',
        description: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').trim(),
        SDPosterUrl: movie.poster || movie.tvPoster || '',
        HDPosterUrl: movie.poster || movie.tvPoster || '',
        heroImage: movie.tvPoster || movie.poster || '',
        streamUrl: movie.fullMovie || '',
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: movieGenreMap.get(movie.key) || [],
        rating: movie.rating ? movie.rating.toFixed(1) : "0.0",
        duration: movie.durationInMinutes ? `${movie.durationInMinutes} min` : "0 min",
        isLiked: user?.likedMovies?.includes(movie.key) ?? false,
        isOnWatchlist: user?.watchlist?.includes(movie.key) ?? false,
        isWatched: user?.watchedMovies?.includes(movie.key) ?? false,
    };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    let user: User | null = null;
    let isDeviceLinked = false;

    if (deviceId) {
        const initError = getInitializationError();
        const db = getAdminDb();
        if (!initError && db) {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            if (linkDoc.exists) {
                isDeviceLinked = true;
                const uid = linkDoc.data()?.userId;
                if (uid) {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        user = { uid, ...userDoc.data() } as User;
                    }
                }
            }
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
    const heroItems = heroMovieKeys
        .map((key: string) => visibleMovies[key])
        .filter((movie): movie is Movie => !!movie)
        .map((movie: Movie) => formatMovieForRoku(movie, movieGenreMap, user));
        
    const processCategory = (categoryData: Category, itemComponentName?: string): RokuCategory | null => {
        if (!categoryData || !Array.isArray(categoryData.movieKeys)) return null;
        const rokuMovies = categoryData.movieKeys
            .map(movieKey => visibleMovies[movieKey])
            .filter((movie): movie is Movie => !!movie)
            .map(movie => formatMovieForRoku(movie, movieGenreMap, user));
        if (rokuMovies.length > 0) return { title: categoryData.title, children: rokuMovies, itemComponentName };
        return null;
    };
    
    // Create My List category if user is linked and has items
    let myListCategory: Category | null = null;
    if (user && user.watchlist && user.watchlist.length > 0) {
        myListCategory = {
            title: "My List",
            movieKeys: [...user.watchlist].reverse() // Show most recently added first
        };
    }
    
    const topTenMovies = (Object.values(visibleMovies) as Movie[])
        .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);

    const topTenCategoryRaw: Category | null = topTenMovies.length > 0 ? {
        title: "Top 10 on Crate TV Today",
        movieKeys: topTenMovies.map((m: Movie) => m.key)
    } : null;

    const topTenCategory = topTenCategoryRaw ? processCategory(topTenCategoryRaw, "RankedMoviePoster") : null;

    const isFestivalLive = festivalConfig?.startDate && festivalConfig?.endDate && 
                           new Date() >= new Date(festivalConfig.startDate) && 
                           new Date() < new Date(festivalConfig.endDate);
                           
    let festivalContent = null;
    if (isFestivalLive && festivalData) {
        festivalContent = {
            config: festivalConfig,
            days: festivalData.map((day: FestivalDay) => ({
                ...day,
                blocks: day.blocks.map((block: FilmBlock) => ({
                    ...block,
                    children: block.movieKeys
                        .map(key => visibleMovies[key])
                        .filter((m): m is Movie => !!m)
                        .map(m => formatMovieForRoku(m, movieGenreMap, user))
                }))
            }))
        };
    }
    
    const accountItem: RokuMovie = {
        id: isDeviceLinked ? "account_linked" : "link_account_action",
        title: isDeviceLinked ? `Account Linked` : "Link Your Account",
        description: isDeviceLinked 
            ? `Your Crate TV account (${user?.email || '...'}) is linked to this Roku device.`
            : "Link your Crate TV account to sync your watchlist, likes, and more. Select this item to get your unique link code.",
        SDPosterUrl: "pkg:/images/logo_hd.png",
        HDPosterUrl: "pkg:/images/logo_hd.png",
        heroImage: "", streamUrl: "", director: "", actors: [], genres: [], rating: "", duration: "",
        isLiked: false, isOnWatchlist: false, isWatched: false,
    };

    const accountCategory: RokuCategory = {
        title: "My Account",
        children: [accountItem],
        itemComponentName: "ActionItem"
    };

    const finalCategories: RokuCategory[] = [];
    
    // Add My List to the top if it exists
    if(myListCategory) {
        const processed = processCategory(myListCategory, "MoviePoster");
        if(processed) finalCategories.push(processed);
    }

    if(topTenCategory) {
        finalCategories.push(topTenCategory);
    }
    
    const processedKeys = new Set(['featured', 'nowStreaming', 'publicDomainIndie']);
    const remainingCategoryOrder = ["newReleases", "awardWinners", "comedy", "drama", "documentary", "pwff12thAnnual", "exploreTitles"];
    
    remainingCategoryOrder.forEach((key: string) => {
        if (!processedKeys.has(key) && categoriesData[key]) {
            const processed = processCategory(categoriesData[key], "MoviePoster");
            if(processed) finalCategories.push(processed);
        }
    });

    // Always add public domain classics and the account section at the end
    if(categoriesData.publicDomainIndie) {
        const processed = processCategory(categoriesData.publicDomainIndie, "MoviePoster");
        if(processed) finalCategories.push(processed);
    }
    
    finalCategories.push(accountCategory);

    const content = {
      heroItems: heroItems,
      categories: finalCategories,
      isLinked: isDeviceLinked,
      uid: user?.uid, // Pass uid for client-side actions
      isFestivalLive: isFestivalLive,
      festivalContent: festivalContent,
    };

    return new Response(JSON.stringify(content, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate',
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