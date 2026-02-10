import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMovieReleased } from '../constants.js';

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
        live: movie.liveStreamStatus === 'live' || movie.isWatchPartyEnabled === true,
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
        features: { liveStreaming: false, watchParties: true, paidContent: true, festivalMode: false }
    } as any;
    
    const assets: Record<string, RokuAsset> = {};
    const viewCounts: Record<string, number> = {};
    let unlockedMovies = new Set<string>();

    if (db) {
        const [configDoc, assetsSnap, viewsSnap] = await Promise.all([
            db.collection('roku').doc('config').get(),
            db.collection('roku_assets').get(),
            db.collection('view_counts').get()
        ]);

        if (configDoc.exists) config = { ...config, ...configDoc.data() };
        assetsSnap.forEach(doc => { assets[doc.id] = doc.data() as RokuAsset; });
        
        viewsSnap.forEach(doc => { 
            const d = doc.data();
            viewCounts[doc.id] = Number(d.count || 0); 
        });

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

    const categories: any[] = [];
    const publicSquare: any[] = [];

    const isValidForRoku = (m: Movie) => !!m && !!m.title && !!m.poster && !m.isUnlisted && isMovieReleased(m) && (!!m.rokuStreamUrl || !!m.fullMovie);

    // 1. TOP 10 TODAY (CANONICAL ROW)
    const topTenTitle = config.topTen?.title || "Top 10 Today";
    if (config.topTen?.enabled !== false) {
        const mode = config.topTen?.mode || 'auto';
        let topMoviesKeys = (mode === 'manual' && config.topTen?.movieKeys?.length) 
            ? config.topTen.movieKeys 
            : (Object.values(moviesObj) as Movie[])
                .filter(isValidForRoku)
                .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
                .slice(0, 10)
                .map(m => m.key);

        const topMovies = topMoviesKeys
            .map(k => moviesObj[k])
            .filter(isValidForRoku)
            .map(m => {
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || !m.isForSale;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            });

        if (topMovies.length > 0) {
            categories.push({
                title: topTenTitle,
                type: 'ranked',
                categoryType: 'ranked',
                children: topMovies
            });
        }
    }

    // 2. CATEGORIES (Funneling into Public Square or Main Feed)
    Object.entries(categoriesObj).forEach(([key, cat]: [string, any]) => {
        const rowTitle = config.categories?.customTitles?.[key] || cat.title || '';
        const normalizedTitle = rowTitle.toLowerCase();
        
        // Suppress duplicates and unneeded rows
        if (normalizedTitle.includes('top 10') || key === 'featured' || (config.categories?.hidden || []).includes(key)) return;
        
        const children = (cat.movieKeys || [])
            .map((k: string) => moviesObj[k])
            .filter((m: Movie) => m && isValidForRoku(m) && !(config.content?.hiddenMovies || []).includes(m.key))
            .map((movie: Movie) => {
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(movie.key) || !movie.isForSale;
                return formatMovieForRoku(movie, assets[movie.key], isUnlocked);
            });
        
        if (children.length > 0) {
            const rowType = (key.toLowerCase().includes('watch') ? 'live' : 'standard');
            const row = { 
                title: rowTitle, 
                type: rowType,
                categoryType: rowType,
                children 
            };

            // CRITICAL ROUTING: Vintage Visions & Community Records -> Public Square
            const isExplicitPublic = (key === 'publicAccess' || key === 'publicSquare' || key === 'publicDomainIndie');
            if (isExplicitPublic || (config.categories?.separateSection || []).includes(key)) {
                publicSquare.push(row);
            } else {
                categories.push(row);
            }
        }
    });

    const response: RokuFeed = {
        version: Date.now(),
        timestamp: new Date().toISOString(),
        heroItems: categories[0]?.children.slice(0, 5) || [],
        categories,
        publicSquare,
        liveNow: []
    };

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json', 
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
    });

  } catch (error) {
    console.error("Feed generation failed:", error);
    return new Response(JSON.stringify({ error: "Feed generation failed." }), { status: 500 });
  }
}