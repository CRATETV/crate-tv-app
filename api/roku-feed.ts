
import { getApiData } from './_lib/data.js';
import { Movie, Category, User, RokuConfig } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

interface RokuItem {
    id: string;
    title: string;
    description: string;
    SDPosterUrl: string;
    HDPosterUrl: string;
    heroImage: string;
    streamUrl?: string;
    director?: string;
    actors?: string[];
    genres?: string[];
    rating?: string;
    duration?: string;
    length?: number;
    isLiked?: boolean;
    isOnWatchlist?: boolean;
    isLive?: boolean;
    isPremium?: boolean;
    productId?: string;
    contentType: 'movie' | 'live' | 'festival';
}

interface RokuCategory {
    title: string;
    children: RokuItem[];
}

const formatMovieForRoku = (movie: Movie, genres: string[], user: User | null): RokuItem => {
    const cleanSynopsis = (movie.synopsis || '').replace(/<[^>]+>/g, '').trim();
    const finalHeroImage = movie.rokuHeroImage || movie.tvPoster || movie.poster || '';
    
    // PRIORITY: live stream -> roku optimized stream -> standard movie file
    let finalStreamUrl = movie.fullMovie || '';
    if (movie.liveStreamStatus === 'live') {
        finalStreamUrl = movie.liveStreamUrl || '';
    } else if (movie.rokuStreamUrl) {
        finalStreamUrl = movie.rokuStreamUrl;
    }
    
    return {
        id: movie.key,
        title: movie.title || 'Untitled Film',
        description: cleanSynopsis,
        SDPosterUrl: movie.poster || '',
        HDPosterUrl: movie.poster || '',
        heroImage: finalHeroImage,
        streamUrl: finalStreamUrl,
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: genres,
        rating: movie.rating ? movie.rating.toFixed(1) : "0.0",
        duration: movie.durationInMinutes ? `${movie.durationInMinutes} min` : "0 min",
        length: movie.durationInMinutes ? movie.durationInMinutes * 60 : 0,
        isLiked: user?.likedMovies?.includes(movie.key) ?? false,
        isOnWatchlist: user?.watchlist?.includes(movie.key) ?? false,
        isLive: movie.liveStreamStatus === 'live',
        isPremium: movie.isRokuPremium || false,
        productId: movie.rokuProductId,
        contentType: movie.liveStreamStatus === 'live' ? 'live' : 'movie'
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

    const apiData = await getApiData();
    const configDoc = db ? await db.collection('content').doc('roku_config').get() : null;
    const config = (configDoc?.exists ? configDoc.data() : {}) as RokuConfig;
    
    const moviesObj = apiData.movies || {};
    const movieArray = Object.values(moviesObj) as Movie[];
    const finalCategories: RokuCategory[] = [];

    // 1. LIVE NOW SECTOR
    const liveItems = movieArray.filter(m => m.liveStreamStatus === 'live').map(m => formatMovieForRoku(m, ["Live"], user));
    if (liveItems.length > 0) {
        finalCategories.push({ title: "Sector Priority: Live Broadcast", children: liveItems });
    }

    // 2. HERO CAROUSEL PREP
    const featuredKeys = config.featuredKeys || [];
    const heroItems = featuredKeys.map(k => moviesObj[k]).filter(Boolean).map(m => formatMovieForRoku(m as Movie, ["Featured"], user));

    // 3. DYNAMIC CATEGORY LOGIC
    const categoryOrder = config.categoryOrder || ["newReleases", "awardWinners"];
    const visibleKeys = config.visibleCategoryKeys || categoryOrder;

    categoryOrder.forEach(key => {
        if (!visibleKeys.includes(key)) return;
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
        version: "2.2",
        categories: finalCategories,
        heroItems: heroItems.length > 0 ? heroItems : finalCategories[0]?.children.slice(0, 5) || [],
        isFestivalMode: config.isFestivalModeActive || false
    }), {
      status: 200,
      headers: { 
          'Content-Type': 'application/json', 
          'Cache-Control': 's-maxage=1, stale-while-revalidate=5',
          'Access-Control-Allow-Origin': '*' 
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ categories: [], heroItems: [] }), { status: 200 });
  }
}
