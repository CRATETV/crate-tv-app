
// This is a Vercel Serverless Function that generates a feed for the custom Roku channel.
// It will be accessible at the path /api/roku-feed

import { getApiData } from './_lib/data.js';
import { Movie, Category, User } from '../types.js';
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
    isCratemas?: boolean;
    itemComponentName?: string;
}

interface RokuCategory {
    title: string;
    children: (RokuMovie | null)[];
    itemComponentName?: string;
}

const getVisibleMovies = (moviesData: Record<string, any>): Record<string, Movie> => {
    const visibleMovies: Record<string, Movie> = {};
    const now = new Date();

    Object.values(moviesData).forEach((data: any) => {
      const movie = data as Movie;
      if (!movie) return; 
      const releaseDate = movie.releaseDateTime ? new Date(movie.releaseDateTime) : null;
      const isReleased = !releaseDate || releaseDate <= now;
      if (isReleased) {
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
        description: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim(),
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
        isCratemas: movie.isCratemas || false
    };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    let user: User | null = null;
    if (deviceId) {
        const initError = getInitializationError();
        const db = getAdminDb();
        if (!initError && db) {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            if (linkDoc.exists) {
                const uid = linkDoc.data()?.userId;
                if (uid) {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) user = { uid, ...userDoc.data() } as User;
                }
            }
        }
    }

    const apiData = await getApiData();
    const moviesData = apiData.movies || {};
    const categoriesData = apiData.categories || {};
    const settings = apiData.settings || { isHolidayModeActive: false };

    const visibleMovies = getVisibleMovies(moviesData);
    const movieGenreMap = new Map<string, string[]>();
    Object.keys(visibleMovies).forEach(key => movieGenreMap.set(key, []));

    (Object.values(categoriesData) as Category[]).forEach((category: Category) => {
        if (category && Array.isArray(category.movieKeys)) {
            category.movieKeys.forEach(movieKey => {
                if (movieGenreMap.has(movieKey)) movieGenreMap.get(movieKey)?.push(category.title);
            });
        }
    });
    
    const finalCategories: RokuCategory[] = [];

    // 1. HOLIDAY MODE: CRATEMAS (Highest Priority if active)
    if (settings.isHolidayModeActive) {
        const cratemasMovies = (Object.values(visibleMovies) as Movie[])
            .filter((m: Movie) => m.isCratemas)
            .map((m: Movie) => formatMovieForRoku(m, movieGenreMap, user));
        
        if (cratemasMovies.length > 0) {
            finalCategories.push({
                title: settings.holidayName || "Holiday Collection",
                children: cratemasMovies,
                itemComponentName: "MoviePoster"
            });
        }
    }

    // 2. TOP 10 RANKINGS (Ranked Component)
    const topTenMovies = (Object.values(visibleMovies) as Movie[])
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);

    if (topTenMovies.length > 0) {
        finalCategories.push({
            title: "Top 10 on Crate TV Today",
            children: topTenMovies.map((m: Movie) => formatMovieForRoku(m, movieGenreMap, user)),
            itemComponentName: "RankedMoviePoster"
        });
    }

    // 3. MY LIST (User Specific)
    if (user && user.watchlist && user.watchlist.length > 0) {
        const myList = user.watchlist
            .map(key => visibleMovies[key])
            .filter((m): m is Movie => !!m)
            .map((m: Movie) => formatMovieForRoku(m, movieGenreMap, user))
            .reverse();
        
        finalCategories.push({
            title: "My List",
            children: myList,
            itemComponentName: "MoviePoster"
        });
    }

    // 4. GENERAL CATEGORIES
    const categoryOrder = ["newReleases", "awardWinners", "comedy", "drama", "documentary"];
    categoryOrder.forEach(key => {
        const cat = categoriesData[key];
        if (cat && Array.isArray(cat.movieKeys)) {
            const children = cat.movieKeys
                .map((k: string) => visibleMovies[k])
                .filter((m: Movie | undefined): m is Movie => !!m)
                .map((m: Movie) => formatMovieForRoku(m, movieGenreMap, user));
            
            if (children.length > 0) {
                finalCategories.push({
                    title: cat.title,
                    children,
                    itemComponentName: "MoviePoster"
                });
            }
        }
    });

    // 5. ACCOUNT SECTION
    finalCategories.push({
        title: "My Account",
        children: [{
            id: user ? "account_linked" : "link_account_action",
            title: user ? "Account Connected" : "Connect Account",
            description: user ? `Linked to ${user.email}` : "Sync your Watchlist and Likes from your phone to your TV.",
            SDPosterUrl: "pkg:/images/logo_hd.png",
            HDPosterUrl: "pkg:/images/logo_hd.png",
            heroImage: "", streamUrl: "", director: "", actors: [], genres: [], rating: "", duration: "",
            isLiked: false, isOnWatchlist: false, isWatched: false
        }],
        itemComponentName: "ActionItem"
    });

    return new Response(JSON.stringify({
        heroItems: (categoriesData['featured']?.movieKeys || [])
            .map((k: string) => visibleMovies[k])
            .filter((m: Movie | undefined): m is Movie => !!m)
            .map((m: Movie) => formatMovieForRoku(m, movieGenreMap, user)),
        categories: finalCategories,
        isFestivalLive: apiData.isFestivalLive || false
    }, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate'
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to generate feed.' }), { status: 500 });
  }
}
