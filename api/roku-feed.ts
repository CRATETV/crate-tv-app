import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMovieReleased, moviesData as fallbackMovies, categoriesData as fallbackCategories } from '../constants.js';

// ─── In-memory cache (persists across requests within the same Vercel instance) ───
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let firestoreCache: {
    config: any;
    assets: Record<string, RokuAsset>;
    viewCounts: Record<string, number>;
    moviesObj: Record<string, Movie>;
    categoriesObj: Record<string, any>;
    fetchedAt: number;
} | null = null;

function isCacheValid(): boolean {
    return !!firestoreCache && (Date.now() - firestoreCache.fetchedAt) < CACHE_TTL_MS;
}

function sanitizeUrl(url: string): string {
    if (!url) return '';
    return url.trim().replace(/ /g, '%20');
}

function toDate(val: any): Date | null {
    if (!val) return null;
    if (val.toDate && typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && val._seconds) return new Date(val._seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function isReleased(movie: Movie | undefined | null): boolean {
    if (!movie || !movie.releaseDateTime) return true;
    const date = toDate(movie.releaseDateTime);
    return !date || date <= new Date();
}

function formatMovieForRoku(movie: Movie, asset?: RokuAsset, isUnlocked: boolean = true): RokuMovie {
    const streamUrl = sanitizeUrl(asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || (movie as any).streamUrl || '');
    const isHls = streamUrl.toLowerCase().includes('.m3u8');
    const posterUrl = sanitizeUrl(asset?.tvPoster || movie.tvPoster || movie.poster || (movie as any).hdPosterUrl || '');
    const heroUrl = sanitizeUrl(asset?.heroImage || movie.rokuHeroImage || (movie as any).heroImage || movie.tvPoster || movie.poster || '');
    const publishedDate = toDate(movie.publishedAt);
    return {
        ...movie,
        id: movie.key,
        title: movie.title || 'Untitled',
        description: (movie.synopsis || (movie as any).description || '').replace(/<[^>]+>/g, '').trim(),
        hdPosterUrl: posterUrl,
        heroImage: heroUrl,
        streamUrl: streamUrl,
        streamFormat: isHls ? 'hls' : streamUrl.includes('.mpd') ? 'dash' : 'mp4',
        year: publishedDate ? publishedDate.getFullYear().toString() : '2025',
        runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
        isFree: !movie.isForSale,
        live: movie.liveStreamStatus === 'live' || movie.isWatchPartyEnabled === true,
        isUnlocked: isUnlocked,
        purchaseUrl: `https://cratetv.net/movie/${movie.key}?action=buy`
    };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const bustCache = searchParams.get('bust');

    // Force cache refresh if ?bust param is present
    if (bustCache) firestoreCache = null;

    const apiData = await getApiData({ noCache: true });
    const moviesObj: Record<string, Movie> = { ...fallbackMovies, ...(apiData.movies || {}) };
    const categoriesObj: Record<string, Category> = { ...fallbackCategories, ...(apiData.categories || {}) };

    const db = getAdminDb();
    let config: RokuConfig = { categories: { separateSection: [] }, topTen: { enabled: true, mode: 'auto' } } as any;
    const assets: Record<string, RokuAsset> = {};
    const viewCounts: Record<string, number> = {};
    let unlockedMovies = new Set<string>();

    if (db) {
        if (isCacheValid()) {
            console.log(`[roku-feed] Using cached Firestore data (age: ${Math.round((Date.now() - firestoreCache!.fetchedAt) / 1000)}s)`);
            config = firestoreCache!.config;
            Object.assign(assets, firestoreCache!.assets);
            Object.assign(viewCounts, firestoreCache!.viewCounts);
            Object.assign(moviesObj, firestoreCache!.moviesObj);
            Object.assign(categoriesObj, firestoreCache!.categoriesObj);
        } else {
            try {
                console.log('[roku-feed] Fetching fresh data from Firestore...');
                const [configDoc, assetsSnap, viewsSnap, moviesSnap, categoriesSnap] = await Promise.all([
                    db.collection('roku').doc('config').get(),
                    db.collection('roku_assets').get(),
                    db.collection('view_counts').get(),
                    db.collection('movies').get(),
                    db.collection('categories').get()
                ]);

                const freshConfig = configDoc.exists ? { ...config, ...configDoc.data() } : config;
                const freshAssets: Record<string, RokuAsset> = {};
                const freshViewCounts: Record<string, number> = {};
                const freshMovies: Record<string, Movie> = {};
                const freshCategories: Record<string, any> = {};

                assetsSnap.forEach(doc => { freshAssets[doc.id] = doc.data() as RokuAsset; });
                viewsSnap.forEach(doc => { freshViewCounts[doc.id] = Number(doc.data().count || 0); });
                if (!moviesSnap.empty) moviesSnap.forEach(doc => { freshMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie; });
                if (!categoriesSnap.empty) categoriesSnap.forEach(doc => { freshCategories[doc.id] = { id: doc.id, ...doc.data() }; });

                firestoreCache = {
                    config: freshConfig,
                    assets: freshAssets,
                    viewCounts: freshViewCounts,
                    moviesObj: freshMovies,
                    categoriesObj: freshCategories,
                    fetchedAt: Date.now()
                };

                config = freshConfig;
                Object.assign(assets, freshAssets);
                Object.assign(viewCounts, freshViewCounts);
                Object.assign(moviesObj, freshMovies);
                Object.assign(categoriesObj, freshCategories);

                console.log(`[roku-feed] Firestore fetched & cached: ${moviesSnap.size} movies, ${categoriesSnap.size} categories`);
            } catch (firestoreErr) {
                console.error("[roku-feed] Firestore error, continuing with base data:", firestoreErr);
            }
        }

        // Always fetch per-device unlock data fresh (user-specific, never cached)
        if (deviceId) {
            try {
                const linkDoc = await db.collection('roku_links').doc(deviceId).get();
                if (linkDoc.exists) {
                    const userId = linkDoc.data()?.userId;
                    const userDoc = await db.collection('users').doc(userId).get();
                    const userData = userDoc.data();
                    if (userData?.rentals) Object.entries(userData.rentals).forEach(([key, exp]: [string, any]) => { const expDate = toDate(exp); if (expDate && expDate > new Date()) unlockedMovies.add(key); });
                    if (userData?.hasJuryPass) unlockedMovies.add('ALL');
                }
            } catch (e) {
                console.error('[roku-feed] Error fetching user unlock data:', e);
            }
        }
    }

    console.log(`[roku-feed] Total movies: ${Object.keys(moviesObj).length}`);

    const isValidForRoku = (m: Movie) => {
        if (!m) return false;
        const hasTitle = !!m.title;
        const isNotUnlisted = !m.isUnlisted;
        const released = isReleased(m);
        const hasStream = !!(m.rokuStreamUrl || m.fullMovie || m.liveStreamUrl || (m as any).streamUrl || (m as any).videoUrl);
        if (!hasTitle || !isNotUnlisted || !released || !hasStream) {
            console.log(`[roku-feed] Rejected [${m.key}]: title=${hasTitle}, unlisted=${!isNotUnlisted}, released=${released}, stream=${hasStream}`);
            return false;
        }
        return true;
    };

    const categories: any[] = [];
    const publicSquare: any[] = [];

    if (config.topTen?.enabled !== false) {
        const topMovies = (Object.values(moviesObj) as Movie[])
            .filter(isValidForRoku)
            .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
            .slice(0, 10)
            .map(m => formatMovieForRoku(m, assets[m.key], unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || !m.isForSale));
        if (topMovies.length > 0) categories.push({ title: config.topTen?.title || "Top 10 Today", type: 'ranked', categoryType: 'topTen', children: topMovies });
        console.log(`[roku-feed] Top 10: ${topMovies.length} movies`);
    }

    Object.entries(categoriesObj).forEach(([key, cat]: [string, any]) => {
        if (key === 'featured' || (config.categories?.hidden || []).includes(key)) return;
        const movieKeys = cat.movieKeys || [];
        const children = movieKeys
            .map((k: string) => moviesObj[k])
            .filter((m: Movie) => m && isValidForRoku(m) && !(config.content?.hiddenMovies || []).includes(m.key))
            .map((movie: Movie) => formatMovieForRoku(movie, assets[movie.key], unlockedMovies.has('ALL') || unlockedMovies.has(movie.key) || !movie.isForSale));
        console.log(`[roku-feed] Category [${key}]: ${children.length}/${movieKeys.length} movies`);
        if (children.length > 0) {
            const row = { title: config.categories?.customTitles?.[key] || cat.title || key, type: 'standard', categoryType: key, children };
            if (key === 'publicAccess' || key === 'publicDomainIndie' || (config.categories?.separateSection || []).includes(key)) publicSquare.push(row);
            else categories.push(row);
        }
    });

    if (categories.length === 0 && publicSquare.length === 0) {
        console.log("[roku-feed] No categories — building Library fallback...");
        const allValidMovies = (Object.values(moviesObj) as Movie[])
            .filter(isValidForRoku)
            .map((m: Movie) => formatMovieForRoku(m, assets[m.key], unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || !m.isForSale));
        console.log(`[roku-feed] Library: ${allValidMovies.length} movies`);
        if (allValidMovies.length > 0) categories.push({ title: "Library", type: 'standard', categoryType: 'library', children: allValidMovies });
    }

    console.log(`[roku-feed] Done: ${categories.length} rows, ${publicSquare.length} public square rows`);

    return new Response(
        JSON.stringify({
            version: Date.now(),
            timestamp: new Date().toISOString(),
            heroItems: (categories[0]?.children || publicSquare[0]?.children || []).slice(0, 5),
            categories,
            publicSquare,
            liveNow: []
        }),
        {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }
    );
  } catch (error) {
    console.error("[roku-feed] Fatal error:", error);
    return new Response(
        JSON.stringify({ version: Date.now(), timestamp: new Date().toISOString(), heroItems: [], categories: [], publicSquare: [], liveNow: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
