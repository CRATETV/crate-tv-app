
import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

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
  categories: { mode: 'all', hidden: [], order: [], customTitles: {}, separateSection: ['publicAccess'] },
  // FIX: Added 'content' field to the default Roku configuration to ensure compatibility with the updated RokuConfig interface.
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

function encodeImageUrl(url: string): string {
    if (!url) return '';
    if (url.includes('%20')) return url;
    return url
        .replace(/ /g, '%20')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
}

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
  const streamUrl = asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || '';
  const hdPosterUrl = encodeImageUrl(asset?.tvPoster || movie.tvPoster || movie.poster || '');
  
  return {
    ...movie,
    id: movie.key,
    title: movie.title || 'Untitled',
    description: (movie.synopsis || '').replace(/<[^>]+>/g, '').trim(),
    hdPosterUrl,
    heroImage: encodeImageUrl(asset?.heroImage || movie.rokuHeroImage || movie.tvPoster || movie.poster || ''),
    streamUrl: streamUrl,
    streamFormat: detectFormat(streamUrl),
    year: extractYear(movie.publishedAt),
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
                    // FIX: Merged content overrides from database into the active config object.
                    content: { ...config.content, ...(data?.content || {}) },
                    features: { ...config.features, ...(data?.features || {}) },
                };
            }
            const assetsSnap = await db.collection('roku_assets').get();
            assetsSnap.forEach(doc => { assets[doc.id] = doc.data() as RokuAsset; });
        } catch (e) { console.warn('⚠️ [ROKU_INFRA] Config fetch failed'); }
    }

    const visibleMovies = Object.fromEntries(
        Object.entries(moviesObj).filter(([key, m]) => !(config.content?.hiddenMovies || []).includes(key))
    ) as Record<string, Movie>;

    const rows: RokuFeed['rows'] = [];

    // 1. Build "Now Streaming" Priority Row
    if (config.nowStreaming?.enabled) {
        let nsKeys = [];
        if (config.nowStreaming.mode === 'manual') {
            nsKeys = config.nowStreaming.movieKeys || [];
        } else {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - (config.nowStreaming.daysBack || 30));
            nsKeys = Object.values(visibleMovies)
                .filter(m => new Date(m.publishedAt || 0) >= cutoff)
                .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
                .map(m => m.key);
        }
        const children = nsKeys.filter(k => visibleMovies[k]).map(k => formatMovieForRoku(visibleMovies[k], assets[k]));
        if (children.length > 0) {
            rows.push({ title: config.nowStreaming.title || 'Now Streaming', type: 'standard', children });
        }
    }

    // 2. Build "Top 10 Today" Ranked Row
    if (config.topTen?.enabled) {
        let ttKeys = [];
        if (config.topTen.mode === 'manual') {
            ttKeys = config.topTen.movieKeys || [];
        } else {
            // In auto mode, we'd ideally use view counts from analytics, but here we fallback to likes for the mock
            ttKeys = Object.values(visibleMovies)
                .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                .slice(0, 10)
                .map(m => m.key);
        }
        const children = ttKeys.filter(k => visibleMovies[k]).map((k, i) => ({
            ...formatMovieForRoku(visibleMovies[k], assets[k]),
            rank: i + 1
        }));
        if (children.length > 0) {
            rows.push({ 
                title: config.topTen.title || 'Top 10 Today', 
                type: 'ranked', 
                showNumbers: config.topTen.showNumbers,
                children 
            });
        }
    }

    // 3. Main Curation Rows
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
        if (children.length > 0) {
            rows.push({ title: cat.title, type: 'standard', children });
        }
    });

    // 4. Public Square (Isolated Segment)
    const publicSquare = Array.from(separateSet).map(key => {
        const cat = categoriesObj[key];
        if (!cat) return null;
        return {
            title: config.categories.customTitles?.[key] || cat.title,
            children: (cat.movieKeys || []).filter((k: string) => visibleMovies[k]).map((k: string) => formatMovieForRoku(visibleMovies[k], assets[k]))
        };
    }).filter((c): c is any => c !== null && c.children.length > 0);

    // 5. Hero Selection
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
    if (heroItems.length === 0 && rows.length > 0) heroItems = rows[0].children.slice(0, 5);

    return new Response(JSON.stringify({
        version: config._version || 1,
        timestamp: new Date().toISOString(),
        heroItems,
        rows,
        publicSquare,
        liveNow: [],
    } as RokuFeed), {
        status: 200,
        headers: { 
            'Content-Type': 'application/json', 
            'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
            'Access-Control-Allow-Origin': '*' 
        },
    });

  } catch (error) {
    console.error("Roku Feed Logic Failure:", error);
    return new Response(JSON.stringify({ rows: [], heroItems: [], version: -1 }), { status: 200 });
  }
}
