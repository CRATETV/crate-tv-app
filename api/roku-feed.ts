
import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

const MIME_TYPES = {
    hls: 'application/vnd.apple.mpegurl',
    dash: 'application/dash+xml',
    mp4: 'video/mp4'
};

function sanitizeUrl(url: string): string {
    if (!url) return '';
    return url.trim().replace(/ /g, '%20');
}

function formatMovieForRoku(movie: Movie, asset?: RokuAsset, isUnlocked: boolean = true): RokuMovie {
    const streamUrl = sanitizeUrl(asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || '');
    const isHls = streamUrl.toLowerCase().includes('.m3u8');
    const posterUrl = sanitizeUrl(asset?.tvPoster || movie.tvPoster || movie.poster || '');
    const heroUrl = sanitizeUrl(asset?.heroImage || movie.rokuHeroImage || movie.tvPoster || movie.poster || '');

    return {
        ...movie,
        id: movie.key, 
        title: movie.title || 'Untitled',
        description: (movie.synopsis || '').replace(/<[^>]+>/g, '').trim(),
        hdPosterUrl: posterUrl,
        heroImage: heroUrl,
        streamUrl: streamUrl,
        streamFormat: isHls ? 'hls' : streamUrl.includes('.mpd') ? 'dash' : 'mp4',
        year: movie.publishedAt ? new Date(movie.publishedAt).getFullYear().toString() : '2025',
        runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
        isFree: !movie.isForSale,
        live: movie.liveStreamStatus === 'live',
        // Paywall metadata
        isUnlocked: isUnlocked,
        purchaseUrl: `https://cratetv.net/movie/${movie.key}?action=buy`
    };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    
    const apiData = await getApiData({ noCache: true });
    const moviesObj = apiData.movies || {};
    const categoriesObj = apiData.categories || {};

    const db = getAdminDb();
    let config: RokuConfig = { 
        _version: 1, 
        _lastUpdated: null, 
        _updatedBy: 'system',
        hero: { mode: 'auto', items: [] },
        topTen: { enabled: true, mode: 'auto', title: 'Top 10 Today', movieKeys: [], showNumbers: true },
        nowStreaming: { enabled: true, title: 'Now Streaming', mode: 'auto', movieKeys: [], daysBack: 30 },
        categories: { mode: 'all', hidden: [], order: [], customTitles: {}, separateSection: [] },
        content: { hiddenMovies: [], featuredMovies: [] },
        features: { liveStreaming: false, watchParties: false, paidContent: true, festivalMode: false }
    };
    
    const assets: Record<string, RokuAsset> = {};
    let unlockedMovies = new Set<string>();

    if (db) {
        const configDoc = await db.collection('roku').doc('config').get();
        if (configDoc.exists) config = { ...config, ...configDoc.data() };
        
        const assetsSnap = await db.collection('roku_assets').get();
        assetsSnap.forEach(doc => { assets[doc.id] = doc.data() as RokuAsset; });

        // Check user link for VOD authorization
        if (deviceId) {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            if (linkDoc.exists) {
                const userId = linkDoc.data()?.userId;
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();
                if (userData?.rentals) {
                    Object.entries(userData.rentals).forEach(([key, exp]: [string, any]) => {
                        if (new Date(exp) > new Date()) unlockedMovies.add(key);
                    });
                }
                if (userData?.hasJuryPass) unlockedMovies.add('ALL');
            }
        }
    }

    const categories: RokuFeed['categories'] = [];

    Object.entries(categoriesObj).forEach(([key, cat]: [string, any]) => {
        if ((config.categories.hidden || []).includes(key)) return;
        const children = (cat.movieKeys || [])
            .filter((k: string) => moviesObj[k] && !(config.content.hiddenMovies || []).includes(k))
            .map((k: string) => {
                const movie = moviesObj[k];
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(k) || !movie.isForSale;
                return formatMovieForRoku(movie, assets[k], isUnlocked);
            });
        
        if (children.length > 0) {
            categories.push({ 
                title: config.categories.customTitles?.[key] || cat.title, 
                type: key === 'topTen' ? 'ranked' : 'standard', 
                children 
            });
        }
    });

    const response: RokuFeed = {
        version: config._version || 1,
        timestamp: new Date().toISOString(),
        heroItems: categories[0]?.children.slice(0, 5) || [],
        categories,
        publicSquare: [],
        liveNow: []
    };

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Feed generation failed." }), { status: 500 });
  }
}
