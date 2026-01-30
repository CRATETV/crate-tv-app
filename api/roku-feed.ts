
import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

// ============================================================
// PRODUCTION POSTER OVERRIDES (VERIFIED ASSETS)
// ============================================================

const POSTER_URL_FIXES: Record<string, string> = {
  'lifeless': 'https://cratetelevision.s3.us-east-1.amazonaws.com/Lifeless+poster+remake+.jpg',
  'hair': 'https://cratetelevision.s3.us-east-1.amazonaws.com/Hair+poster+209+X+209++(2).jpg',
  'you-vs-them': 'https://cratetelevision.s3.us-east-1.amazonaws.com/you+vs+them+poster+.png',
  'street-eats-the-boot': 'https://cratetelevision.s3.us-east-1.amazonaws.com/Street%2BEats%2Bgthe%2BBoot%2Bposter(2).jpeg',
  'finally-caught': 'https://cratetelevision.s3.us-east-1.amazonaws.com/finally+caught+poster+.png',
  'crossroads': 'https://cratetelevision.s3.us-east-1.amazonaws.com/crossroads(Mobile+Video).jpg',
  'almas-vows': "https://cratetelevision.s3.us-east-1.amazonaws.com/Alma's+vows+poster+remake+.png",
  'its-in-you': "https://cratetelevision.s3.us-east-1.amazonaws.com/it's+in+you+poster+jpeg",
  'silent-love': 'https://cratetelevision.s3.us-east-1.amazonaws.com/silent+Love++poster+remake+.jpg'
};

const POSTER_FALLBACK = 'https://cratetv.net/images/poster-placeholder.png';

// ============================================================
// BULLETPROOF FALLBACK DEFAULTS
// ============================================================

const DEFAULT_ROKU_CONFIG: RokuConfig = {
  _version: 0,
  _lastUpdated: null,
  _updatedBy: 'system',
  hero: { mode: 'auto', items: [] },
  topTen: { enabled: true, mode: 'auto', title: 'Top 10 Today', movieKeys: [], showNumbers: true },
  nowStreaming: { enabled: true, title: 'Now Streaming', mode: 'auto', movieKeys: [], daysBack: 30 },
  categories: { mode: 'all', hidden: [], order: [], customTitles: {}, separateSection: ['publicAccess', 'publicDomainIndie'] },
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

function sanitizeUrl(url: string): string {
    if (!url) return '';
    // Preserve already encoded URLs
    if (url.includes('%20')) return url;
    
    // Explicit cleaning for Roku internal parser
    return url
        .trim()
        .replace(/ /g, '%20')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
}

function isValidUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

function formatMovieForRoku(movie: Movie, asset?: RokuAsset): RokuMovie {
  const movieKey = movie.key?.toLowerCase() || '';
  
  // 1. Determine optimized stream source
  const streamUrl = sanitizeUrl(asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || '');
  
  // 2. Resolve Poster Art with hardcoded high-priority overrides
  let posterUrl = POSTER_URL_FIXES[movieKey] || asset?.tvPoster || movie.tvPoster || movie.poster || '';
  
  if (!isValidUrl(posterUrl) || posterUrl.includes('broken')) {
      posterUrl = POSTER_FALLBACK;
  } else {
      posterUrl = sanitizeUrl(posterUrl);
  }

  // 3. Resolve Hero Image
  let heroUrl = asset?.heroImage || movie.rokuHeroImage || movie.tvPoster || movie.poster || '';
  heroUrl = isValidUrl(heroUrl) ? sanitizeUrl(heroUrl) : posterUrl;
  
  return {
    ...movie,
    id: movie.key, // BRIGHTSCRIPT: maps to 'id'
    title: movie.title || 'Untitled',
    description: (movie.synopsis || '').replace(/<[^>]+>/g, '').trim(),
    hdPosterUrl: posterUrl,
    heroImage: heroUrl,
    streamUrl: streamUrl,
    streamFormat: streamUrl.includes('.m3u8') ? 'hls' : streamUrl.includes('.mpd') ? 'dash' : 'mp4',
    year: movie.publishedAt ? new Date(movie.publishedAt).getFullYear().toString() : '2025',
    runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
    isFree: !movie.isForSale,
    live: movie.liveStreamStatus === 'live',
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================

export async function GET(request: Request) {
  try {
    const apiData = await getApiData();
    const moviesObj = apiData.movies || {};
    const categoriesObj = apiData.categories || {};

    const db = getAdminDb();
    const initError = getInitializationError();

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
                    topTen: { ...config.topTen, ...(data?.topTen || {}) },
                    nowStreaming: { ...config.nowStreaming, ...(data?.nowStreaming || {}) },
                    categories: { ...config.categories, ...(data?.categories || {}) },
                    content: { ...config.content, ...(data?.content || {}) },
                    features: { ...config.features, ...(data?.features || {}) },
                };
            }
            const assetsSnap = await db.collection('roku_assets').get();
            assetsSnap.forEach(doc => { assets[doc.id] = doc.data() as RokuAsset; });
        } catch (e) { console.warn('⚠️ [ROKU_FEED] Config load failed'); }
    }

    const visibleMovies = Object.fromEntries(
        Object.entries(moviesObj).filter(([key, m]) => !(config.content?.hiddenMovies || []).includes(key))
    ) as Record<string, Movie>;

    // ⚠️ CRITICAL: The Roku app expects the key "categories" at the top level
    const categories: RokuFeed['categories'] = [];

    // 1. NOW STREAMING (Pos 0)
    if (config.nowStreaming?.enabled) {
        let keys = [];
        if (config.nowStreaming.mode === 'manual') {
            keys = config.nowStreaming.movieKeys || [];
        } else {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - (config.nowStreaming.daysBack || 30));
            keys = Object.values(visibleMovies)
                .filter(m => new Date(m.publishedAt || 0) >= cutoff)
                .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
                .map(m => m.key);
        }
        const children = keys.filter(k => visibleMovies[k]).map(k => formatMovieForRoku(visibleMovies[k], assets[k]));
        if (children.length > 0) {
            categories.push({ title: config.nowStreaming.title || 'Now Streaming', type: 'standard', children });
        }
    }

    // 2. TOP 10 TODAY (Pos 1)
    if (config.topTen?.enabled) {
        let keys = [];
        if (config.topTen.mode === 'manual') {
            keys = config.topTen.movieKeys || [];
        } else {
            keys = Object.values(visibleMovies)
                .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                .slice(0, 10)
                .map(m => m.key);
        }
        const children = keys.filter(k => visibleMovies[k]).map((k, i) => ({
            ...formatMovieForRoku(visibleMovies[k], assets[k]),
            rank: i + 1
        }));
        if (children.length > 0) {
            categories.push({ title: config.topTen.title || 'Top 10 Today', type: 'ranked', showNumbers: config.topTen.showNumbers, children });
        }
    }

    // 3. STANDALONE CURATION
    const separateSet = new Set(config.categories.separateSection || []);
    const hiddenSet = new Set(config.categories.hidden || []);
    
    const categoryList = Object.entries(categoriesObj)
        .filter(([key]) => !separateSet.has(key) && !hiddenSet.has(key))
        .map(([key, cat]: [string, any]) => ({
            key,
            title: config.categories.customTitles?.[key] || cat.title,
            movieKeys: cat.movieKeys || [],
            order: (config.categories.order || []).indexOf(key)
        }))
        .sort((a, b) => {
            if (a.order === -1 && b.order === -1) return a.title.localeCompare(b.title);
            if (a.order === -1) return 1;
            if (b.order === -1) return -1;
            return a.order - b.order;
        });

    categoryList.forEach(cat => {
        const children = cat.movieKeys.filter((k: string) => visibleMovies[k]).map((k: string) => formatMovieForRoku(visibleMovies[k], assets[k]));
        if (children.length > 0) categories.push({ title: cat.title, type: 'standard', children });
    });

    // 4. PUBLIC SQUARE (Isolated)
    const publicSquare = Array.from(separateSet).map(key => {
        const cat = categoriesObj[key];
        if (!cat) return null;
        return {
            title: config.categories.customTitles?.[key] || cat.title,
            children: (cat.movieKeys || []).filter((k: string) => visibleMovies[k]).map((k: string) => formatMovieForRoku(visibleMovies[k], assets[k]))
        };
    }).filter((c): c is any => c !== null && c.children.length > 0);

    // 5. HERO
    let heroItems: RokuMovie[] = [];
    if (config.hero?.mode === 'manual' && config.hero?.items?.length > 0) {
        heroItems = config.hero.items
            .sort((a, b) => a.order - b.order)
            .filter(h => visibleMovies[h.movieKey])
            .map(h => {
                const m = formatMovieForRoku(visibleMovies[h.movieKey], assets[h.movieKey]);
                if (h.customTitle) m.title = h.customTitle;
                return m;
            }).slice(0, 5);
    }
    if (heroItems.length === 0 && categories.length > 0) {
        heroItems = categories[0].children.slice(0, 5);
    }

    const response: RokuFeed = {
        version: config._version || 1,
        timestamp: new Date().toISOString(),
        heroItems,
        categories: categories, // ⚠️ KEY FOR ROKU
        publicSquare,
        liveNow: [],
    };

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json', 
            'Cache-Control': 's-maxage=60',
            'Access-Control-Allow-Origin': '*' 
        },
    });

  } catch (error) {
    console.error("CRITICAL_ROKU_FEED_FAILURE:", error);
    return new Response(JSON.stringify({ 
        categories: [{ title: 'Syncing Nodes...', children: [] }], 
        version: -1 
    }), { status: 200 });
  }
}
