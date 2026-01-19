
import { getApiData } from './_lib/data.js';
import { Movie, Category, User } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

interface RokuItem {
    id: string;
    title: string;
    description: string;
    shortDescription: string;
    SDPosterUrl: string;
    HDPosterUrl: string;
    heroImage: string;
    streamUrl?: string;
    director?: string;
    actors?: string[];
    genres?: string[];
    rating?: string;
    duration?: string;
    length?: number; // duration in seconds
    isLiked?: boolean;
    isOnWatchlist?: boolean;
    isWatched?: boolean;
    itemComponentName?: string;
    contentType: 'movie' | 'editorial';
}

interface RokuCategory {
    title: string;
    children: RokuItem[];
}

const formatMovieForRoku = (movie: Movie, genres: string[], user: User | null): RokuItem => {
    const cleanSynopsis = (movie.synopsis || '').replace(/<[^>]+>/g, '').trim();
    return {
        id: movie.key,
        title: movie.title || 'Untitled Film',
        description: cleanSynopsis,
        shortDescription: cleanSynopsis.substring(0, 200),
        SDPosterUrl: movie.poster || '',
        HDPosterUrl: movie.poster || '',
        heroImage: movie.tvPoster || movie.poster || '',
        streamUrl: movie.fullMovie || '',
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: genres,
        rating: movie.rating ? movie.rating.toFixed(1) : "0.0",
        duration: movie.durationInMinutes ? `${movie.durationInMinutes} min` : "0 min",
        length: movie.durationInMinutes ? movie.durationInMinutes * 60 : 0,
        isLiked: user?.likedMovies?.includes(movie.key) ?? false,
        isOnWatchlist: user?.watchlist?.includes(movie.key) ?? false,
        isWatched: user?.watchedMovies?.includes(movie.key) ?? false,
        contentType: 'movie'
    };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    let user: User | null = null;
    const initError = getInitializationError();
    const db = getAdminDb();
    
    if (deviceId && !initError && db) {
        const linkDoc = await db.collection('roku_links').doc(deviceId).get();
        if (linkDoc.exists) {
            const uid = linkDoc.data()?.userId;
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) user = { uid, ...userDoc.data() } as User;
        }
    }

    // Fetch master data
    const apiData = await getApiData();
    const viewCounts = apiData.viewCounts || {};
    const moviesObj = apiData.movies || {};
    
    const finalCategories: RokuCategory[] = [];

    // 1. TOP 10 RANKINGS
    const movieArray = Object.values(moviesObj) as Movie[];
    const topTen = movieArray
        .filter(m => !!m && !m.isUnlisted && !!m.poster && !!m.title && !m.title.toLowerCase().includes('untitled'))
        .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
        .slice(0, 10);

    if (topTen.length > 0) {
        finalCategories.push({
            title: "Sector Priority: Top 10 Today",
            children: topTen.map(m => ({
                ...formatMovieForRoku(m, ["Top 10"], user),
                itemComponentName: "RankedPosterItem"
            }))
        });
    }

    // 2. THE SQUARE
    const squareKeys = Array.from(new Set([
        ...(apiData.categories?.['publicAccess']?.movieKeys || []),
        ...(apiData.categories?.['publicDomainIndie']?.movieKeys || [])
    ]));

    if (squareKeys.length > 0) {
        const children = squareKeys
            .map((k: string) => moviesObj[k])
            .filter((m: any): m is Movie => !!m && !m.isUnlisted && !!m.title)
            .map((m: Movie) => formatMovieForRoku(m, ["The Square"], user));
        if (children.length > 0) {
            finalCategories.push({ title: "The Public Square", children });
        }
    }

    // 3. DYNAMIC CATALOG CATEGORIES
    const catalogOrder = ["newReleases", "awardWinners", "comedy", "drama"];
    catalogOrder.forEach(key => {
        const cat = apiData.categories?.[key];
        if (cat && cat.movieKeys?.length > 0) {
            const children = cat.movieKeys
                .map((k: string) => moviesObj[k])
                .filter((m: any): m is Movie => !!m && !m.isUnlisted && !!m.title)
                .map((m: Movie) => formatMovieForRoku(m, [cat.title], user));
            
            if (children.length > 0) {
                finalCategories.push({ title: cat.title, children });
            }
        }
    });

    return new Response(JSON.stringify({
        categories: finalCategories,
        heroItems: topTen.slice(0, 5).map(m => formatMovieForRoku(m, ["Featured"], user))
    }, null, 2), {
      status: 200,
      headers: { 
          'Content-Type': 'application/json', 
          'Cache-Control': 's-maxage=1, stale-while-revalidate=5',
          'Access-Control-Allow-Origin': '*' 
      },
    });
  } catch (error) {
    console.error("Roku Feed Logic Failure:", error);
    return new Response(JSON.stringify({ 
        categories: [], 
        heroItems: [], 
        error: 'System core re-syncing.' 
    }), { status: 200 });
  }
}
