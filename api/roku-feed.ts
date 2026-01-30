
import { getApiData } from './_lib/data.js';
import { Movie, Category, User, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

// ============================================================
// BULLETPROOF FALLBACK DEFAULTS
// ============================================================

const DEFAULT_ROKU_CONFIG: RokuConfig = {
  _version: 0,
  _lastUpdated: null,
  _updatedBy: 'system',
  hero: { mode: 'auto', items: [] },
  categories: { mode: 'all', hidden: [], order: [], customTitles: {} },
  content: { hiddenMovies: [], featuredMovies: [] },
  features: {
    liveStreaming: false,
    watchParties: false,
    paidContent: false,
    festivalMode: false,
  },
};

// ============================================================
// HELPERS
// ============================================================

function extractYear(date: string | undefined): string {
  if (!date) return '2025';
  try {
    return new Date(date).getFullYear().toString();
  } catch {
    return '2025';
  }
}

function detectFormat(url: string): 'mp4' | 'hls' | 'dash' {
  if (url.includes('.m3u8')) return 'hls';
  if (url.includes('.mpd')) return 'dash';
  return 'mp4';
}

function formatMovieForRoku(movie: Movie, asset?: RokuAsset): RokuMovie {
  // PRIORITY: Roku optimized stream -> Standard movie file
  const streamUrl = asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || '';
  
  return {
    ...movie,
    id: movie.key,
    title: movie.title || 'Untitled',
    description: (movie.synopsis || '').replace(/<[^>]+>/g, '').trim(),
    hdPosterUrl: asset?.tvPoster || movie.tvPoster || movie.poster || '',
    heroImage: asset?.heroImage || movie.rokuHeroImage || movie.tvPoster || movie.poster || '',
    streamUrl: streamUrl,
    streamFormat: detectFormat(streamUrl),
    year: extractYear(movie.publishedAt),
    runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
    isFree: !movie.isForSale,
    live: movie.liveStreamStatus === 'live',
  };
}

// ============================================================
// EMERGENCY FALLBACKS
// ============================================================

function buildEmergencyFeed(movies: Record<string, Movie>, categories: Record<string, Category>): RokuFeed {
  console.warn('⚠️ [ROKU_INFRA] BUILDING EMERGENCY FEED - All config ignored');
  
  const allCategories = Object.entries(categories).map(([key, cat]) => ({
    title: cat.title,
    children: (cat.movieKeys || [])
      .filter(k => movies[k])
      .map(k => formatMovieForRoku(movies[k])),
  })).filter(c => c.children.length > 0);
  
  return {
    version: -1,
    timestamp: new Date().toISOString(),
    heroItems: allCategories[0]?.children.slice(0, 3) || [],
    categories: allCategories,
    liveNow: [],
    watchParties: [],
  };
}

function buildMinimalFeed(): RokuFeed {
  console.error('🚨 [ROKU_INFRA] BUILDING MINIMAL FEED - Database unavailable');
  return {
    version: -999,
    timestamp: new Date().toISOString(),
    heroItems: [],
    categories: [{
      title: 'Transmission Syncing...',
      children: [],
    }],
    liveNow: [],
    watchParties: [],
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function GET(request: Request) {
  try {
    // 1. Get Source Data (The Sacred Data)
    const apiData = await getApiData();
    const moviesObj = apiData.movies || {};
    const categoriesObj = apiData.categories || {};

    const db = getAdminDb();
    const initError = getInitializationError();

    // 2. Get Roku Overrides (with Safe Defaults)
    let config = { ...DEFAULT_ROKU_CONFIG };
    const assets: Record<string, RokuAsset> = {};

    if (db && !initError) {
        try {
            const configDoc = await db.collection('roku').doc('config').get();
            if (configDoc.exists) {
                const data = configDoc.data();
                config = {
                    ...config,
                    ...data,
                    hero: { ...config.hero, ...(data?.hero || {}) },
                    categories: { ...config.categories, ...(data?.categories || {}) },
                    content: { ...config.content, ...(data?.content || {}) },
                    features: { ...config.features, ...(data?.features || {}) },
                };
            }

            const assetsSnap = await db.collection('roku_assets').get();
            assetsSnap.forEach(doc => {
                assets[doc.id] = doc.data() as RokuAsset;
            });
        } catch (e) {
            console.warn('⚠️ [ROKU_INFRA] Override fetch failed, using defaults');
        }
    }

    // 3. APPLY FILTERS SAFELY (Explicit HIDE)
    const hiddenMovieSet = new Set(config.content?.hiddenMovies || []);
    const visibleMovies = Object.fromEntries(
        Object.entries(moviesObj).filter(([key]) => !hiddenMovieSet.has(key))
    ) as Record<string, Movie>;

    const hiddenCategorySet = new Set(config.categories?.hidden || []);
    const categoryOrder = config.categories?.order || [];
    const customTitles = config.categories?.customTitles || {};

    let categoryList = Object.entries(categoriesObj)
        .filter(([key]) => !hiddenCategorySet.has(key))
        .map(([key, cat]: [string, any]) => ({
            key,
            title: customTitles[key] || cat.title,
            movieKeys: cat.movieKeys || [],
            order: categoryOrder.indexOf(key),
        }));

    // Sort: Config order first, others to end
    categoryList.sort((a, b) => {
        if (a.order === -1 && b.order === -1) return a.title.localeCompare(b.title);
        if (a.order === -1) return 1;
        if (b.order === -1) return -1;
        return a.order - b.order;
    });

    // 4. Build Categories
    const feedCategories = categoryList.map(cat => ({
        title: cat.title,
        children: cat.movieKeys
            .filter((key: string) => visibleMovies[key])
            .map((key: string) => formatMovieForRoku(visibleMovies[key], assets[key])),
    })).filter(cat => cat.children.length > 0);

    // 5. Build Hero Items
    let heroItems: RokuMovie[] = [];
    if (config.hero?.mode === 'manual' && config.hero?.items?.length > 0) {
        heroItems = config.hero.items
            .sort((a, b) => a.order - b.order)
            .filter(h => visibleMovies[h.movieKey])
            .map(h => {
                const m = formatMovieForRoku(visibleMovies[h.movieKey], assets[h.movieKey]);
                if (h.customTitle) m.title = h.customTitle;
                return m;
            })
            .slice(0, 5);
    }

    // Hero Fallback: First row
    if (heroItems.length === 0 && feedCategories.length > 0) {
        heroItems = feedCategories[0].children.slice(0, 5);
    }

    // 6. VALIDATE & RESPOND
    if (feedCategories.length === 0) {
        return new Response(JSON.stringify(buildEmergencyFeed(moviesObj, categoriesObj)), { status: 200 });
    }

    return new Response(JSON.stringify({
        version: config._version || 1,
        timestamp: new Date().toISOString(),
        heroItems,
        categories: feedCategories,
        liveNow: [], // Future expansion
        watchParties: [], // Future expansion
    } as RokuFeed), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json', 
            'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
            'Access-Control-Allow-Origin': '*' 
        },
    });

  } catch (error) {
    console.error("CRITICAL FEED ERROR:", error);
    return new Response(JSON.stringify(buildMinimalFeed()), { status: 200 });
  }
}
