import { getApiData } from './_lib/data.js';
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMovieReleased, moviesData as fallbackMovies, categoriesData as fallbackCategories } from '../constants.js';
import { getAiRecommendations } from './_lib/recommendations.js';

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
    
    // PAYWALL: Only provide full stream URL if content is unlocked
    const streamUrl = isUnlocked ? fullStreamUrl : trailerUrl;
    
    // Log paywall status for debugging
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

    // SECURITY: Build response object explicitly - NEVER include fullMovie or rokuStreamUrl for locked content
    return {
        id: movie.key, 
        key: movie.key,
        title: movie.title || 'Untitled',
        description: description,
        synopsis: movie.synopsis,
        hdPosterUrl: posterUrl,
        heroImage: heroUrl,
        poster: movie.poster,
        tvPoster: movie.tvPoster,
        // CRITICAL: Only include streamUrl (which is already trailer for locked content)
        // NEVER include fullMovie or rokuStreamUrl directly - the Roku app checks those first!
        streamUrl: streamUrl,
        streamFormat: isHls ? 'hls' : streamUrl.includes('.mpd') ? 'dash' : 'mp4',
        // Only include fullMovie if UNLOCKED - this is the key security fix
        fullMovie: isUnlocked ? movie.fullMovie : undefined,
        rokuStreamUrl: isUnlocked ? movie.rokuStreamUrl : undefined,
        trailer: movie.trailer,
        year: publishedDate ? publishedDate.getFullYear().toString() : '2025',
        runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
        durationInMinutes: movie.durationInMinutes,
        director: movie.director,
        cast: movie.cast,
        genres: movie.genres,
        publishedAt: movie.publishedAt,
        isFree: isMovieFree,
        isForSale: movie.isForSale === true,
        isWatchPartyPaid: movie.isWatchPartyPaid === true,
        salePrice: movie.salePrice,
        live: movie.liveStreamStatus === 'live' || movie.isWatchPartyEnabled === true || isLiveOverride,
        isWatchPartyEnabled: movie.isWatchPartyEnabled === true,
        isFestival: isFestivalOverride,
        isUnlocked: isUnlocked,
        purchaseUrl: `https://cratetv.net/movie/${movie.key}?action=buy`
    } as RokuMovie;
}

const cache = new Map<string, { response: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceIdParam = searchParams.get('deviceId');
    const cacheKey = deviceIdParam || 'global';
    const nowTime = Date.now();

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (nowTime - cached.timestamp < CACHE_TTL)) {
        console.log(`Serving Roku feed from cache for key: ${cacheKey}`);
        return new Response(JSON.stringify(cached.response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'HIT'
            },
        });
    }

    const apiData = await getApiData({ noCache: true });
    const moviesObj: Record<string, Movie> = { ...fallbackMovies, ...(apiData.movies || {}) };
    const categoriesObj: Record<string, Category> = { ...fallbackCategories, ...(apiData.categories || {}) };

    const db = getAdminDb();
    let config: RokuConfig = { 
        categories: { separateSection: [] },
        topTen: { enabled: true, mode: 'auto' }
    } as any;
    
    const assets: Record<string, RokuAsset> = {};
    const viewCounts: Record<string, number> = {};
    let unlockedMovies = new Set<string>();

    if (db) {
        console.log("Fetching data from Firestore...");
        const [configDoc, assetsSnap, viewsSnap, moviesSnap, categoriesSnap, settingsDoc, configSettingsDoc, partiesSnap, rokuSettingsDoc] = await Promise.all([
            db.collection('roku').doc('config').get(),
            db.collection('roku_assets').get(),
            db.collection('view_counts').get(),
            db.collection('movies').get(),
            db.collection('categories').get(),
            db.collection('content').doc('settings').get(),
            db.collection('settings').doc('config').get(),
            db.collection('watch_parties').get(),
            db.collection('settings').doc('roku').get()
        ]);

        if (configDoc.exists) config = { ...config, ...configDoc.data() };
        
        // Roku Announcement Banner
        if (rokuSettingsDoc.exists) {
            const rokuData = rokuSettingsDoc.data();
            if (rokuData?.announcement) {
                (config as any).announcement = rokuData.announcement;
            }
        }
        
        // Crate Fest Config (from settings/config)
        if (configSettingsDoc.exists) {
            const configData = configSettingsDoc.data();
            if (configData?.crateFestConfig) {
                const fest = configData.crateFestConfig;
                // isLive is the primary flag requested by the user
                const isCrateFestLive = fest.isLive === true;
                const isCrateFestActive = fest.isActive && fest.startDate && fest.endDate && 
                                        (new Date() >= new Date(fest.startDate) && new Date() <= new Date(fest.endDate));
                
                if (isCrateFestActive || isCrateFestLive) {
                    (config as any).crateFest = {
                        ...fest,
                        isLive: isCrateFestLive
                    };
                }
            }
        }

        // Fallback or legacy settings (from content/settings)
        if (settingsDoc.exists && !(config as any).crateFest) {
            const settingsData = settingsDoc.data();
            if (settingsData?.crateFestConfig) {
                const fest = settingsData.crateFestConfig;
                const isCrateFestActive = fest.isActive && fest.startDate && fest.endDate && 
                                        (new Date() >= new Date(fest.startDate) && new Date() <= new Date(fest.endDate));
                if (isCrateFestActive) {
                    (config as any).crateFest = fest;
                }
            }
        }
        assetsSnap.forEach(doc => { assets[doc.id] = doc.data() as RokuAsset; });
        viewsSnap.forEach(doc => { viewCounts[doc.id] = Number(doc.data().count || 0); });
        
        const activeParties: Record<string, any> = {};
        partiesSnap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'live') activeParties[doc.id] = data;
        });
        (config as any).activeParties = activeParties;
        
        console.log(`Found ${moviesSnap.size} movies and ${categoriesSnap.size} categories in Firestore.`);

        // Prefer Firestore data over S3/Fallbacks if available
        if (!moviesSnap.empty) {
            moviesSnap.forEach(doc => {
                const data = doc.data();
                moviesObj[doc.id] = { key: doc.id, ...data } as Movie;
            });
        }
        
        if (!categoriesSnap.empty) {
            categoriesSnap.forEach(doc => {
                const data = doc.data();
                categoriesObj[doc.id] = { id: doc.id, ...data } as any as Category;
            });
        }

        if (deviceIdParam) {
            const linkDoc = await db.collection('roku_links').doc(deviceIdParam).get();
            if (linkDoc.exists) {
                const userId = linkDoc.data()?.userId;
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();
                if (userData?.rentals) {
                    Object.entries(userData.rentals).forEach(([key, exp]: [string, any]) => {
                        const expDate = toDate(exp);
                        if (expDate && expDate > new Date()) unlockedMovies.add(key);
                    });
                }

                // 2. Check blocks (New Record format)
                let festSnap: any = null;
                if (userData?.unlockedBlocks) {
                    festSnap = await db.collection('festival').doc('schedule').collection('days').get();
                    const activeBlockIds = new Set<string>();
                    Object.entries(userData.unlockedBlocks).forEach(([id, exp]: [string, any]) => {
                        const expDate = toDate(exp);
                        if (expDate && expDate > new Date()) activeBlockIds.add(id);
                    });
                    
                    festSnap.forEach((doc: any) => {
                        const day = doc.data();
                        day.blocks?.forEach((block: any) => {
                            if (activeBlockIds.has(block.id)) {
                                block.movieKeys?.forEach((k: string) => unlockedMovies.add(k));
                            }
                        });
                    });
                }

                // 3. Check blocks (Old Array format - Backwards Compatibility)
                if (Array.isArray(userData?.unlockedBlockIds)) {
                    if (!festSnap) festSnap = await db.collection('festival').doc('schedule').collection('days').get();
                    const activeBlockIds = new Set(userData.unlockedBlockIds);
                    festSnap.forEach((doc: any) => {
                        const day = doc.data();
                        day.blocks?.forEach((block: any) => {
                            if (activeBlockIds.has(block.id)) {
                                block.movieKeys?.forEach((k: string) => unlockedMovies.add(k));
                            }
                        });
                    });
                }

                if (userData?.hasJuryPass) unlockedMovies.add('ALL');
                
                // Check Festival Pass Expiry
                if (userData?.festivalPassExpiry) {
                    const exp = toDate(userData.festivalPassExpiry);
                    if (exp && exp > new Date()) unlockedMovies.add('ALL');
                } else if (userData?.hasFestivalAllAccess) {
                    unlockedMovies.add('ALL');
                }

                // Check Crate Fest Pass Expiry
                if (userData?.crateFestPassExpiry) {
                    const exp = toDate(userData.crateFestPassExpiry);
                    if (exp && exp > new Date()) unlockedMovies.add('ALL');
                } else if (userData?.hasCrateFestPass) {
                    unlockedMovies.add('ALL');
                }
            }
        }
    }

    const categories: any[] = [];
    const publicSquare: any[] = [];

    const isValidForRoku = (m: Movie, isLiveOverride: boolean = false) => {
        if (!m) return false;
        const hasTitle = !!m.title;
        const hasPoster = !!m.poster || !!m.tvPoster || !!m.rokuHeroImage;
        const isNotUnlisted = !m.isUnlisted;
        const released = isReleased(m) || isLiveOverride;
        const hasStream = !!m.rokuStreamUrl || !!m.fullMovie || !!m.liveStreamUrl;
        
        const valid = hasTitle && hasPoster && isNotUnlisted && released && hasStream;
        
        if (!valid) {
            // Log rejection reason for debugging
            console.log(`Movie rejected for Roku [${m.key || 'unknown'}]: title:${hasTitle}, poster:${hasPoster}, unlisted:${!isNotUnlisted}, released:${released}, stream:${hasStream}`);
        }
        return valid;
    };

    // 1. CRATE FEST (Highest Priority)
    if ((config as any).crateFest) {
        const fest = (config as any).crateFest;
        const isLive = fest.isLive === true;
        const movieKeys = fest.movieBlocks?.flatMap((b: any) => b.movieKeys) || [];
        const children = movieKeys
            .map((k: string) => moviesObj[k])
            .filter((m: Movie) => m && isValidForRoku(m, true))
            .map((m: Movie) => {
                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked, isLive, true);
            });
        
        if (children.length > 0) {
            categories.push({
                title: fest.title || "Film Festival",
                type: 'standard',
                categoryType: 'crateFest',
                festivalIsLive: isLive,
                children
            });
        }
    }

    // 2. PREMIER ACCESS (Paid Content)
    const premierMovies = (Object.values(moviesObj) as Movie[])
        .filter(m => isValidForRoku(m) && (m.isForSale || m.isWatchPartyPaid))
        .sort((a, b) => {
            const dateA = toDate(a.publishedAt) || new Date(0);
            const dateB = toDate(b.publishedAt) || new Date(0);
            return dateB.getTime() - dateA.getTime();
        })
        .map(m => {
            const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
            const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
            return formatMovieForRoku(m, assets[m.key], isUnlocked);
        });

    if (premierMovies.length > 0) {
        categories.push({
            title: "Premier Access (Visit cratetv.net to Unlock)",
            type: 'standard',
            categoryType: 'premierAccess',
            children: premierMovies
        });
    }

    // 3. TOP 10 TODAY
    if (config.topTen?.enabled !== false) {
        const topMovies = (Object.values(moviesObj) as Movie[])
            .filter(m => isValidForRoku(m))
            .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
            .slice(0, 10)
            .map(m => {
                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            });

        if (topMovies.length > 0) {
            categories.push({
                title: config.topTen?.title || "Top 10 Today",
                type: 'ranked',
                categoryType: 'topTen',
                children: topMovies
            });
        }
    }

    // 4. USER-SPECIFIC ROWS (Continue Watching & My List)
    if (deviceIdParam) {
        const db = getAdminDb();
        if (db) {
            const linkDoc = await db.collection('roku_links').doc(deviceIdParam).get();
            if (linkDoc.exists) {
                const userId = linkDoc.data()?.userId;
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();
                
                if (userData) {
                    // CONTINUE WATCHING
                    if (userData.playbackProgress) {
                        const continueWatchingMovies = Object.entries(userData.playbackProgress as Record<string, number>)
                            .filter(([key, progress]) => progress > 0 && !(userData.watchedMovies || []).includes(key))
                            .sort((a, b) => b[1] - a[1])
                            .map(([key]) => moviesObj[key])
                            .filter((m: Movie) => m && isValidForRoku(m))
                            .slice(0, 10)
                            .map((m: Movie) => {
                                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                                return formatMovieForRoku(m, assets[m.key], isUnlocked);
                            });

                        if (continueWatchingMovies.length > 0) {
                            categories.push({
                                title: "Continue Watching",
                                type: 'standard',
                                children: continueWatchingMovies
                            });
                        }
                    }

                    // MY LIST (Watchlist)
                    if (Array.isArray(userData.watchlist) && userData.watchlist.length > 0) {
                        const watchlistMovies = userData.watchlist
                            .map((k: string) => moviesObj[k])
                            .filter((m: Movie) => m && isValidForRoku(m))
                            .map((m: Movie) => {
                                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                                return formatMovieForRoku(m, assets[m.key], isUnlocked);
                            });

                        if (watchlistMovies.length > 0) {
                            categories.push({
                                title: "My List",
                                type: 'standard',
                                categoryType: 'watchlist',
                                children: watchlistMovies
                            });
                        }
                    }
                }
            }
        }
    }

    // 5. CRATE INTELLIGENCE (AI Recommendations)
    if (deviceIdParam) {
        const db = getAdminDb();
        if (db) {
            const linkDoc = await db.collection('roku_links').doc(deviceIdParam).get();
            if (linkDoc.exists) {
                const userId = linkDoc.data()?.userId;
                const userDoc = await db.collection('users').doc(userId).get();
                const userData = userDoc.data();
                if (userData) {
                    const recommendations = await getAiRecommendations(
                        Object.values(moviesObj),
                        userData.watchlist || [],
                        userData.likedMovies || []
                    );

                    if (recommendations.length > 0) {
                        const recMovies = recommendations
                            .map(r => moviesObj[r.movieKey])
                            .filter(m => isValidForRoku(m))
                            .map(m => {
                                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                                return formatMovieForRoku(m, assets[m.key], isUnlocked);
                            });

                        if (recMovies.length > 0) {
                            categories.push({
                                title: "Crate Intelligence",
                                type: 'standard',
                                categoryType: 'crateIntelligence',
                                children: recMovies
                            });
                        }
                    }
                }
            }
        }
    }

    // 2. CATEGORIES ROUTING
    console.log(`Processing ${Object.keys(categoriesObj).length} categories...`);
    Object.entries(categoriesObj).forEach(([key, cat]: [string, any]) => {
        if (key === 'featured' || (config.categories?.hidden || []).includes(key)) return;
        
        const movieKeys = cat.movieKeys || [];
        const children = movieKeys
            .map((k: string) => moviesObj[k])
            .filter((m: Movie) => {
                const isValid = m && isValidForRoku(m) && !(config.content?.hiddenMovies || []).includes(m.key);
                return isValid;
            })
            .sort((a: Movie, b: Movie) => {
                const dateA = toDate(a.publishedAt) || new Date(0);
                const dateB = toDate(b.publishedAt) || new Date(0);
                
                // Primary sort: Published Date (Newest First)
                if (dateB.getTime() !== dateA.getTime()) {
                    return dateB.getTime() - dateA.getTime();
                }
                
                // Secondary sort: Position in the category's movieKeys array
                return movieKeys.indexOf(a.key) - movieKeys.indexOf(b.key);
            })
            .map((movie: Movie) => {
                const isMovieFree = !movie.isForSale && !movie.isWatchPartyPaid;
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(movie.key) || isMovieFree;
                return formatMovieForRoku(movie, assets[movie.key], isUnlocked);
            });
        
        console.log(`Category [${key}] has ${children.length} valid movies out of ${movieKeys.length} keys.`);
        
        if (children.length > 0) {
            const row = { 
                title: config.categories?.customTitles?.[key] || cat.title || key, 
                type: 'standard',
                categoryType: key,
                children 
            };

            // ROUTE TO PUBLIC SQUARE
            if (key === 'publicAccess' || key === 'publicDomainIndie' || (config.categories?.separateSection || []).includes(key)) {
                publicSquare.push(row);
            } else {
                categories.push(row);
            }
        }
    });

    // FALLBACK: If no categories were populated but we have valid movies, show them all
    if (categories.length === 0 && publicSquare.length === 0) {
        console.log("No categories populated. Checking for any valid movies to show in fallback 'Library' category...");
        const allValidMovies = (Object.values(moviesObj) as Movie[])
            .filter(m => isValidForRoku(m))
            .map((m: Movie) => {
                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            });
        
        if (allValidMovies.length > 0) {
            console.log(`Found ${allValidMovies.length} valid movies. Adding to 'Library' category.`);
            categories.push({
                title: "Library",
                type: 'standard',
                categoryType: 'library',
                children: allValidMovies
            });
        } else {
            console.log("No valid movies found at all.");
        }
    }

    const response: RokuFeed = {
        version: Date.now(),
        timestamp: new Date().toISOString(),
        announcement: (config as any).announcement || '',
        heroItems: (categories[0]?.children || publicSquare[0]?.children || []).slice(0, 5),
        categories,
        publicSquare,
        liveNow: (Object.values(moviesObj) as Movie[])
            .filter(m => {
                const isWatchParty = m.isWatchPartyEnabled === true;
                const isCrateFest = (config as any).crateFest?.movieBlocks?.some((b: any) => b.movieKeys?.includes(m.key));
                const isExplicitlyLive = (config as any).activeParties?.[m.key];
                const isLive = isWatchParty || isCrateFest || isExplicitlyLive;
                return isLive && isValidForRoku(m, isLive);
            })
            .map(m => {
                const isCrateFest = (config as any).crateFest?.movieBlocks?.some((b: any) => b.movieKeys?.includes(m.key));
                const isExplicitlyLive = (config as any).activeParties?.[m.key];
                const isMovieFree = !m.isForSale && !m.isWatchPartyPaid;
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked, isCrateFest || isExplicitlyLive, isCrateFest);
            })
    };

    // Store in cache
    cache.set(cacheKey, { response, timestamp: nowTime });

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'MISS'
        },
    });
  } catch (error) {
    console.error("Roku Feed Error:", error);
    return new Response(JSON.stringify({
        version: Date.now(),
        timestamp: new Date().toISOString(),
        heroItems: [],
        categories: [],
        publicSquare: [],
        liveNow: []
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
    });
  }
}
