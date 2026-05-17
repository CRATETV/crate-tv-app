import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMovieReleased, moviesData as fallbackMovies, categoriesData as fallbackCategories } from '../constants.js';
import { getAiRecommendations } from './_lib/recommendations.js';

// PERF FIX 1: 5min TTL (was 1min). Public feeds also cached at Vercel Edge via headers.
const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { response: any; timestamp: number }>();

// PERF FIX 2: Cache AI recommendations per user (10min) — Gemini was called every request.
const aiCache = new Map<string, { recs: any[]; timestamp: number }>();
const AI_CACHE_TTL = 10 * 60 * 1000;

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

function formatMovieForRoku(movie: Movie, asset?: RokuAsset, isUnlocked: boolean = false, isLiveOverride: boolean = false, isFestivalOverride: boolean = false): RokuMovie {
    const fullStreamUrl = sanitizeUrl(asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || '');
    const trailerUrl = sanitizeUrl(movie.trailer || '');
    const streamUrl = isUnlocked ? fullStreamUrl : trailerUrl;

    if (movie.isForSale || movie.isWatchPartyPaid) {
        console.log(`[PAYWALL] Movie "${movie.title}" - isForSale: ${movie.isForSale}, isUnlocked: ${isUnlocked}, streamUrl: ${streamUrl ? 'SET' : 'EMPTY'}`);
    }

    const isHls = streamUrl.toLowerCase().includes('.m3u8');
    const posterUrl = sanitizeUrl(asset?.tvPoster || movie.tvPoster || movie.poster || '');
    const heroUrl = sanitizeUrl(asset?.heroImage || movie.rokuHeroImage || movie.tvPoster || movie.poster || '');
    const publishedDate = toDate(movie.publishedAt);

    let description = (movie.synopsis || '').replace(/<[^>]+>/g, '').trim();
    if (!isUnlocked && (movie.isForSale || movie.isWatchPartyPaid)) {
        const price = movie.salePrice || movie.watchPartyPrice || 0;
        const priceStr = price > 0 ? ` [$${price.toFixed(2)}]` : '';
        description = `Visit cratetv.net to unlock this title${priceStr}. ${description}`;
    }

    const isMovieFree = movie.isForSale !== true && movie.isWatchPartyPaid !== true;

    return {
        id: movie.key, key: movie.key, title: movie.title || 'Untitled',
        description, synopsis: movie.synopsis, hdPosterUrl: posterUrl, heroImage: heroUrl,
        poster: movie.poster, tvPoster: movie.tvPoster, streamUrl,
        streamFormat: isHls ? 'hls' : streamUrl.includes('.mpd') ? 'dash' : 'mp4',
        fullMovie: isUnlocked ? movie.fullMovie : undefined,
        rokuStreamUrl: isUnlocked ? movie.rokuStreamUrl : undefined,
        trailer: movie.trailer,
        year: publishedDate ? publishedDate.getFullYear().toString() : '2025',
        runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
        durationInMinutes: movie.durationInMinutes, director: movie.director, cast: movie.cast,
        genres: movie.genres, awardName: movie.awardName, awardYear: movie.awardYear,
        customLaurelUrl: movie.customLaurelUrl, publishedAt: movie.publishedAt,
        isFree: isMovieFree, isForSale: movie.isForSale === true, isWatchPartyPaid: movie.isWatchPartyPaid === true,
        salePrice: movie.salePrice,
        live: movie.liveStreamStatus === 'live' || movie.isWatchPartyEnabled === true || isLiveOverride,
        isWatchPartyEnabled: movie.isWatchPartyEnabled === true, isFestival: isFestivalOverride,
        isUnlocked, purchaseUrl: `https://cratetv.net/movie/${movie.key}?action=buy`
    } as RokuMovie;
}

function getPwffEdition(year: number): string {
    const edition = year - 2013 + 1;
    const s = ['th', 'st', 'nd', 'rd'];
    const v = edition % 100;
    return edition + (s[(v - 20) % 10] || s[v] || s[0]);
}

const isValidForRoku = (m: Movie, isLiveOverride: boolean = false) => {
    if (!m) return false;
    const hasTitle = !!m.title;
    const hasPoster = !!m.poster || !!m.tvPoster || !!m.rokuHeroImage;
    const isNotUnlisted = !m.isUnlisted;
    const released = isReleased(m) || isLiveOverride;
    const hasStream = !!m.rokuStreamUrl || !!m.fullMovie || !!m.liveStreamUrl;
    const valid = hasTitle && hasPoster && isNotUnlisted && released && hasStream;
    if (!valid) console.log(`Movie rejected for Roku [${m.key || 'unknown'}]: title:${hasTitle}, poster:${hasPoster}, unlisted:${!isNotUnlisted}, released:${released}, stream:${hasStream}`);
    return valid;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const deviceIdParam = searchParams.get('deviceId');
        const isPersonalised = !!deviceIdParam;
        const cacheKey = deviceIdParam || 'global';
        const nowTime = Date.now();

        const cached = cache.get(cacheKey);
        if (cached && (nowTime - cached.timestamp < CACHE_TTL)) {
            console.log(`Serving Roku feed from cache for key: ${cacheKey}`);
            return new Response(JSON.stringify(cached.response), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    // PERF FIX 3: Cache-Control tells Vercel Edge to cache public feeds for 5min.
                    'Cache-Control': isPersonalised ? 'private, max-age=60' : 'public, s-maxage=300, stale-while-revalidate=60',
                    'X-Cache': 'HIT',
                },
            });
        }

        const apiData = await getApiData({ noCache: true });
        const moviesObj: Record<string, Movie> = { ...fallbackMovies, ...(apiData.movies || {}) };
        const categoriesObj: Record<string, Category> = { ...fallbackCategories, ...(apiData.categories || {}) };

        const db = getAdminDb();
        let config: RokuConfig = { categories: { separateSection: [] }, topTen: { enabled: true, mode: 'auto' } } as any;
        const assets: Record<string, RokuAsset> = {};
        const viewCounts: Record<string, number> = {};
        let unlockedMovies = new Set<string>();

        // PERF FIX 4: userData fetched ONCE here, reused by Continue Watching, My List, and AI Recs.
        // Previously each of those sections fetched roku_links + users independently = 3x Firestore reads.
        let userData: any = null;
        let resolvedUserId: string | null = null;

        if (db) {
            console.log("Fetching data from Firestore...");

            // PERF FIX 5: All queries run in parallel including the user link lookup.
            const baseQueries: Promise<any>[] = [
                db.collection('roku').doc('config').get(),           // 0
                db.collection('roku_assets').get(),                  // 1
                db.collection('view_counts').get(),                  // 2
                db.collection('movies').get(),                       // 3
                db.collection('categories').get(),                   // 4
                db.collection('content').doc('settings').get(),      // 5
                db.collection('settings').doc('config').get(),       // 6
                db.collection('watch_parties').get(),                // 7
                db.collection('settings').doc('roku').get(),         // 8
            ];

            if (deviceIdParam) baseQueries.push(db.collection('roku_links').doc(deviceIdParam).get()); // 9

            const results = await Promise.all(baseQueries);
            const [configDoc, assetsSnap, viewsSnap, moviesSnap, categoriesSnap, settingsDoc, configSettingsDoc, partiesSnap, rokuSettingsDoc] = results;

            // Resolve user data from the link doc fetched above
            if (deviceIdParam && results[9]?.exists) {
                resolvedUserId = results[9].data()?.userId;
                if (resolvedUserId) {
                    const userDoc = await db.collection('users').doc(resolvedUserId).get();
                    userData = userDoc.data() || null;
                }
            }

            if (configDoc.exists) config = { ...config, ...configDoc.data() };

            if (rokuSettingsDoc.exists) {
                const rokuData = rokuSettingsDoc.data();
                if (rokuData?.announcement) (config as any).announcement = rokuData.announcement;
            }

            if (configSettingsDoc.exists) {
                const configData = configSettingsDoc.data();
                if (configData?.crateFestConfig) {
                    const fest = configData.crateFestConfig;
                    const isCrateFestLive = fest.isLive === true;
                    const isCrateFestActive = fest.isActive && fest.startDate && fest.endDate &&
                        (new Date() >= new Date(fest.startDate) && new Date() <= new Date(fest.endDate));
                    if (isCrateFestActive || isCrateFestLive) (config as any).crateFest = { ...fest, isLive: isCrateFestLive };
                }
            }

            if (settingsDoc.exists && !(config as any).crateFest) {
                const settingsData = settingsDoc.data();
                if (settingsData?.crateFestConfig) {
                    const fest = settingsData.crateFestConfig;
                    const isCrateFestActive = fest.isActive && fest.startDate && fest.endDate &&
                        (new Date() >= new Date(fest.startDate) && new Date() <= new Date(fest.endDate));
                    if (isCrateFestActive) (config as any).crateFest = fest;
                }
            }

            assetsSnap.forEach((doc: any) => { assets[doc.id] = doc.data() as RokuAsset; });
            viewsSnap.forEach((doc: any) => { viewCounts[doc.id] = Number(doc.data().count || 0); });

            const activeParties: Record<string, any> = {};
            partiesSnap.forEach((doc: any) => { if (doc.data().status === 'live') activeParties[doc.id] = doc.data(); });
            (config as any).activeParties = activeParties;

            if (!moviesSnap.empty) moviesSnap.forEach((doc: any) => { moviesObj[doc.id] = { key: doc.id, ...doc.data() } as Movie; });
            if (!categoriesSnap.empty) categoriesSnap.forEach((doc: any) => { categoriesObj[doc.id] = { id: doc.id, ...doc.data() } as any as Category; });

            // Resolve unlocked movies from cached userData
            if (userData) {
                if (userData.rentals) {
                    Object.entries(userData.rentals).forEach(([key, exp]: [string, any]) => {
                        const expDate = toDate(exp);
                        if (expDate && expDate > new Date()) unlockedMovies.add(key);
                    });
                }

                let festSnap: any = null;
                if (userData.unlockedBlocks) {
                    festSnap = await db.collection('festival').doc('schedule').collection('days').get();
                    const activeBlockIds = new Set<string>();
                    Object.entries(userData.unlockedBlocks).forEach(([id, exp]: [string, any]) => {
                        const expDate = toDate(exp);
                        if (expDate && expDate > new Date()) activeBlockIds.add(id);
                    });
                    festSnap.forEach((doc: any) => {
                        doc.data().blocks?.forEach((block: any) => {
                            if (activeBlockIds.has(block.id)) block.movieKeys?.forEach((k: string) => unlockedMovies.add(k));
                        });
                    });
                }

                if (Array.isArray(userData.unlockedBlockIds)) {
                    if (!festSnap) festSnap = await db.collection('festival').doc('schedule').collection('days').get();
                    const activeBlockIds = new Set(userData.unlockedBlockIds);
                    festSnap.forEach((doc: any) => {
                        doc.data().blocks?.forEach((block: any) => {
                            if (activeBlockIds.has(block.id)) block.movieKeys?.forEach((k: string) => unlockedMovies.add(k));
                        });
                    });
                }

                if (userData.hasJuryPass) unlockedMovies.add('ALL');
                if (userData.festivalPassExpiry) { const exp = toDate(userData.festivalPassExpiry); if (exp && exp > new Date()) unlockedMovies.add('ALL'); }
                else if (userData.hasFestivalAllAccess) unlockedMovies.add('ALL');
                if (userData.crateFestPassExpiry) { const exp = toDate(userData.crateFestPassExpiry); if (exp && exp > new Date()) unlockedMovies.add('ALL'); }
                else if (userData.hasCrateFestPass) unlockedMovies.add('ALL');
            }
        }

        const categories: any[] = [];
        const publicSquare: any[] = [];

        // 1. PWFF / CRATE FEST
        if ((config as any).crateFest) {
            const fest = (config as any).crateFest;
            const isLive = fest.isLive === true;
            const movieKeys = fest.movieBlocks?.flatMap((b: any) => b.movieKeys) || [];
            const children = movieKeys.map((k: string) => moviesObj[k]).filter((m: Movie) => m && isValidForRoku(m, true)).map((m: Movie) => {
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid);
                return formatMovieForRoku(m, assets[m.key], isUnlocked, isLive, true);
            });
            if (children.length > 0) {
                const festYear = new Date().getFullYear();
                const festTitle = fest.title || ('Playhouse West Film Festival — ' + getPwffEdition(festYear) + ' Annual');
                categories.unshift({ title: festTitle, type: 'standard', categoryType: 'crateFest', festivalIsLive: isLive, children });
            }
        }

        // 2. PREMIER ACCESS
        const premierMovies = (Object.values(moviesObj) as Movie[]).filter(m => isValidForRoku(m) && (m.isForSale || m.isWatchPartyPaid))
            .sort((a, b) => { const da = toDate(a.publishedAt) || new Date(0); const db2 = toDate(b.publishedAt) || new Date(0); return db2.getTime() - da.getTime(); })
            .map(m => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
        if (premierMovies.length > 0) categories.push({ title: "Premier Access (Visit cratetv.net to Unlock)", type: 'standard', categoryType: 'premierAccess', children: premierMovies });

        // 3. TOP 10
        if (config.topTen?.enabled !== false) {
            const topMovies = (Object.values(moviesObj) as Movie[]).filter(m => isValidForRoku(m))
                .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0)).slice(0, 10)
                .map(m => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
            if (topMovies.length > 0) categories.push({ title: config.topTen?.title || "Top 10 Today", type: 'ranked', categoryType: 'topTen', children: topMovies });
        }

        // 4. CONTINUE WATCHING & MY LIST — uses userData fetched once above (PERF FIX 6)
        if (deviceIdParam && userData) {
            if (userData.playbackProgress) {
                const cwMovies = Object.entries(userData.playbackProgress as Record<string, number>)
                    .filter(([key, progress]) => progress > 0 && !(userData.watchedMovies || []).includes(key))
                    .sort((a, b) => b[1] - a[1]).map(([key]) => moviesObj[key]).filter((m: Movie) => m && isValidForRoku(m)).slice(0, 10)
                    .map((m: Movie) => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
                if (cwMovies.length > 0) categories.push({ title: "Continue Watching", type: 'standard', children: cwMovies });
            }

            if (Array.isArray(userData.watchlist) && userData.watchlist.length > 0) {
                const wlMovies = userData.watchlist.map((k: string) => moviesObj[k]).filter((m: Movie) => m && isValidForRoku(m))
                    .map((m: Movie) => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
                if (wlMovies.length > 0) categories.push({ title: "My List", type: 'standard', categoryType: 'watchlist', children: wlMovies });
            }
        }

        // 5. CRATE INTELLIGENCE — uses userData + AI cache (PERF FIX 7)
        if (deviceIdParam && userData) {
            const aiCacheKey = `ai_${resolvedUserId}`;
            const cachedAi = aiCache.get(aiCacheKey);
            let recommendations: any[] = [];

            if (cachedAi && (nowTime - cachedAi.timestamp < AI_CACHE_TTL)) {
                recommendations = cachedAi.recs;
            } else {
                recommendations = await getAiRecommendations(Object.values(moviesObj), userData.watchlist || [], userData.likedMovies || []);
                aiCache.set(aiCacheKey, { recs: recommendations, timestamp: nowTime });
            }

            if (recommendations.length > 0) {
                const recMovies = recommendations.map((r: any) => moviesObj[r.movieKey]).filter((m: Movie) => m && isValidForRoku(m))
                    .map((m: Movie) => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
                if (recMovies.length > 0) categories.push({ title: "Crate Intelligence", type: 'standard', categoryType: 'crateIntelligence', children: recMovies });
            }
        }

        // 6. CATEGORIES
        Object.entries(categoriesObj).forEach(([key, cat]: [string, any]) => {
            if (key === 'featured' || (config.categories?.hidden || []).includes(key)) return;
            const movieKeys = cat.movieKeys || [];
            const children = movieKeys.map((k: string) => moviesObj[k])
                .filter((m: Movie) => m && isValidForRoku(m) && !(config.content?.hiddenMovies || []).includes(m.key))
                .sort((a: Movie, b: Movie) => {
                    const da = toDate(a.publishedAt) || new Date(0); const db2 = toDate(b.publishedAt) || new Date(0);
                    if (db2.getTime() !== da.getTime()) return db2.getTime() - da.getTime();
                    return movieKeys.indexOf(a.key) - movieKeys.indexOf(b.key);
                })
                .map((movie: Movie) => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(movie.key) || (!movie.isForSale && !movie.isWatchPartyPaid); return formatMovieForRoku(movie, assets[movie.key], isUnlocked); });

            if (children.length > 0) {
                const row = { title: config.categories?.customTitles?.[key] || cat.title || key, type: 'standard', categoryType: key, children };
                if (key === 'publicAccess' || key === 'publicDomainIndie' || (config.categories?.separateSection || []).includes(key)) publicSquare.push(row);
                else categories.push(row);
            }
        });

        if (categories.length === 0 && publicSquare.length === 0) {
            const allValid = (Object.values(moviesObj) as Movie[]).filter(m => isValidForRoku(m))
                .map((m: Movie) => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
            if (allValid.length > 0) categories.push({ title: "Library", type: 'standard', categoryType: 'library', children: allValid });
        }

        // 7. HERO
        let heroItems: RokuMovie[] = [];
        if (config.hero?.mode === 'manual' && Array.isArray(config.hero.items) && config.hero.items.length > 0) {
            heroItems = config.hero.items.sort((a: any, b: any) => a.order - b.order).map((item: any) => moviesObj[item.movieKey]).filter((m: Movie) => m && isValidForRoku(m))
                .map((m: Movie) => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
        }
        if (heroItems.length === 0) {
            const topViewed = (Object.values(moviesObj) as Movie[]).filter(m => isValidForRoku(m)).sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0)).slice(0, 5)
                .map(m => { const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid); return formatMovieForRoku(m, assets[m.key], isUnlocked); });
            heroItems = topViewed.length > 0 ? topViewed : (categories[0]?.children || publicSquare[0]?.children || []).slice(0, 5);
        }

        const response: RokuFeed = {
            version: Date.now(), timestamp: new Date().toISOString(),
            announcement: (config as any).announcement || '',
            heroItems, categories, publicSquare,
            liveNow: (Object.values(moviesObj) as Movie[]).filter(m => {
                const isCrateFest = (config as any).crateFest?.movieBlocks?.some((b: any) => b.movieKeys?.includes(m.key));
                const isExplicitlyLive = (config as any).activeParties?.[m.key];
                const isLive = m.isWatchPartyEnabled === true || isCrateFest || isExplicitlyLive;
                return isLive && isValidForRoku(m, isLive);
            }).map(m => {
                const isCrateFest = (config as any).crateFest?.movieBlocks?.some((b: any) => b.movieKeys?.includes(m.key));
                const isExplicitlyLive = (config as any).activeParties?.[m.key];
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || (!m.isForSale && !m.isWatchPartyPaid);
                return formatMovieForRoku(m, assets[m.key], isUnlocked, isCrateFest || isExplicitlyLive, isCrateFest);
            }),
        };

        cache.set(cacheKey, { response, timestamp: nowTime });

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // PERF FIX 8: Edge caching headers on every response.
                'Cache-Control': isPersonalised ? 'private, max-age=60' : 'public, s-maxage=300, stale-while-revalidate=60',
                'X-Cache': 'MISS',
            },
        });

    } catch (error) {
        console.error("Roku Feed Error:", error);
        return new Response(JSON.stringify({ version: Date.now(), timestamp: new Date().toISOString(), heroItems: [], categories: [], publicSquare: [], liveNow: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    }
}
