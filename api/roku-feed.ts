import { getApiData } from './_lib/data.js';
import { Movie, Category, User } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

// Helper to format movie for Roku
const formatMovieForRoku = (movie: Movie, user: User | null) => {
    if (!movie) return null;
    return {
        id: movie.key,
        title: movie.title,
        description: (movie.synopsis || '').replace(/<br\s*\/?>/gi, '\n').trim(),
        hdPosterUrl: movie.poster || movie.tvPoster,
        sdPosterUrl: movie.poster || movie.tvPoster,
        streamUrl: movie.fullMovie,
        rating: movie.rating ? movie.rating.toFixed(1) : "NR",
        duration: movie.durationInMinutes ? `${movie.durationInMinutes}m` : "",
        isLiked: user?.likedMovies?.includes(movie.key) ?? false,
        // Rich Actor Data for Pause Screen
        actors: movie.cast ? movie.cast.map(c => ({
            name: c.name,
            photo: c.photo || "",
            bio: (c.bio || "").substring(0, 300) + "..." // Truncate for Roku memory
        })) : []
    };
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    let user: User | null = null;

    // 1. Try to find linked user
    if (deviceId) {
        const db = getAdminDb();
        if (db) {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            if (linkDoc.exists) {
                const uid = linkDoc.data()?.userId;
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) user = userDoc.data() as User;
            }
        }
    }

    const { movies, categories, festivalConfig, isFestivalLive, festivalData } = await getApiData();
    const validMovies = Object.values(movies).filter(m => m && m.fullMovie); // Simple filter

    // 2. Get Featured (Hero) Items
    const featuredKeys = categories['featured']?.movieKeys || [];
    const heroItems = featuredKeys
        .map(key => movies[key])
        .filter(m => m)
        .map(m => formatMovieForRoku(m, user));

    // 3. Build Categories
    const finalCategories = [];
    
    // My List (First if exists)
    if (user?.watchlist?.length) {
        finalCategories.push({
            title: "My List",
            children: user.watchlist.map(key => movies[key]).filter(m => m).map(m => formatMovieForRoku(m, user))
        });
    }

    // Standard Cats
    const catOrder = ["newReleases", "awardWinners", "comedy", "drama", "documentary"];
    catOrder.forEach(key => {
        if (categories[key]) {
            finalCategories.push({
                title: categories[key].title,
                children: categories[key].movieKeys.map(k => movies[k]).filter(m => m).map(m => formatMovieForRoku(m, user))
            });
        }
    });

    // Top 10
    const top10 = validMovies.sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 10);
    finalCategories.push({
        title: "Top 10 Today",
        children: top10.map(m => formatMovieForRoku(m, user))
    });

    return new Response(JSON.stringify({
        heroItems,
        categories: finalCategories,
        isFestivalLive,
        festivalContent: isFestivalLive ? { config: festivalConfig, days: festivalData } : null
    }), { status: 200, headers: {'Content-Type': 'application/json'} });
}