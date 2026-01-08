import { getApiData } from './_lib/data.js';
import { Movie, Category, User, EditorialStory } from '../types.js';
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
    return {
        id: movie.key,
        title: movie.title || 'Untitled Film',
        description: (movie.synopsis || '').replace(/<[^>]+>/g, '').trim(),
        SDPosterUrl: movie.poster || '',
        HDPosterUrl: movie.poster || '',
        heroImage: movie.tvPoster || movie.poster || '',
        streamUrl: movie.fullMovie || '',
        director: movie.director || '',
        actors: movie.cast ? movie.cast.map(c => c.name || '') : [],
        genres: genres,
        rating: movie.rating ? movie.rating.toFixed(1) : "0.0",
        duration: movie.durationInMinutes ? `${movie.durationInMinutes} min` : "0 min",
        isLiked: user?.likedMovies?.includes(movie.key) ?? false,
        isOnWatchlist: user?.watchlist?.includes(movie.key) ?? false,
        isWatched: user?.watchedMovies?.includes(movie.key) ?? false,
        contentType: 'movie'
    };
};

const formatStoryForRoku = (story: EditorialStory): RokuItem => {
    return {
        id: story.id,
        title: story.title,
        description: story.subtitle,
        SDPosterUrl: story.heroImage,
        HDPosterUrl: story.heroImage,
        heroImage: story.heroImage,
        contentType: 'editorial',
        itemComponentName: "EditorialPoster"
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
    const finalCategories: RokuCategory[] = [];

    // 1. ZINE / EDITORIAL ROW (Impressive Header Row)
    if (db) {
        const storiesSnap = await db.collection('editorial_stories').orderBy('publishedAt', 'desc').limit(5).get();
        if (!storiesSnap.empty) {
            const stories: RokuItem[] = [];
            storiesSnap.forEach(doc => stories.push(formatStoryForRoku({ id: doc.id, ...doc.data() } as EditorialStory)));
            finalCategories.push({
                title: "Crate Zine: The Dispatch",
                children: stories
            });
        }
    }

    // 2. TOP 10 RANKINGS - RENAMED TO SECTOR PRIORITY
    const topTen = (Object.values(apiData.movies) as Movie[])
        .filter(m => !m.isUnlisted)
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 10);

    if (topTen.length > 0) {
        finalCategories.push({
            title: "Sector Priority: Top 10 Today",
            children: topTen.map(m => ({
                ...formatMovieForRoku(m, ["Top 10"], user),
                itemComponentName: "RankedMoviePoster"
            }))
        });
    }

    // 3. CATALOG CATEGORIES
    const catalogOrder = ["newReleases", "awardWinners", "comedy", "drama"];
    catalogOrder.forEach(key => {
        const cat = apiData.categories[key];
        if (cat && cat.movieKeys?.length > 0) {
            const children = cat.movieKeys
                .map((k: string) => apiData.movies[k])
                .filter((m: any): m is Movie => !!m && !m.isUnlisted)
                .map((m: Movie) => formatMovieForRoku(m, [cat.title], user));
            
            if (children.length > 0) {
                finalCategories.push({ title: cat.title, children });
            }
        }
    });

    return new Response(JSON.stringify({
        categories: finalCategories,
        heroItems: topTen.slice(0, 3).map(m => formatMovieForRoku(m, ["Featured"], user))
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 's-maxage=60' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Feed offline.' }), { status: 500 });
  }
}