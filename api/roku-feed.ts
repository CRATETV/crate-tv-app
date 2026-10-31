import { getApiData } from './_lib/data.js';
import { paidFestivalFilmKeys, isFreeForEveryone } from './_lib/paidRules.js';
import { isPastAvailableUntil, isWatchPartyListable, filmHoldReason } from './_lib/filmAvailability.js';
import { isStaleLive } from './_lib/watchPartyRules.js';
import { rankByViews } from './_lib/topTen.js';
import { rokuImageUrl, ROKU_POSTER_WIDTH, ROKU_HERO_WIDTH } from './_lib/imageHosts.js';
import { findFilmsWithoutVideo, storageKeyCheck } from './_lib/videoExists.js';
import { rokuHlsProxyUrl } from './_lib/hlsRewrite.js';
import { explainFilm, findFilm, explainPlacement, isHeldBackCategory } from './_lib/rokuWhy.js';

// Films in paid festival blocks (their block has the price, not the film).
// Refreshed at the start of every request from the festival schedule.
let paidKeys = new Set<string>();
import { Movie, Category, RokuConfig, RokuFeed, RokuMovie, RokuAsset } from '../types.js';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { isMovieReleased, moviesData as fallbackMovies, categoriesData as fallbackCategories } from '../constants.js';
import { getAiRecommendations } from './_lib/recommendations.js';
import { signStreamUrl } from './_lib/signStreamUrl.js';
import { isOutsidePartner, selectPwffDays } from './_lib/partnerRules.js';
import { streakSummary } from './_lib/streaks.js';
import { isFestivalPassActive } from './_lib/festivalPass.js';
import { introWindow } from './_lib/introSkip.js';

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

// A Roku can only play actual video files (MP4/HLS on our storage). YouTube and
// Vimeo links work on the website (embedded players) but can't play on a Roku,
// so they're left out of the Roku catalogue rather than shown broken.
function isRokuPlayable(url: string | undefined | null): boolean {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return !(u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com'));
}

// The address a Roku is given for a video. Streaming (HLS) films go through the
// cleaned-playlist page (api/_lib/hlsRewrite.ts); single files get a signed link.
async function rokuVideoAddress(raw: string): Promise<string | null> {
    const hls = rokuHlsProxyUrl(raw);
    if (hls) return hls;
    const signed = await signStreamUrl(raw);
    return signed ? signed.url : null;
}

// Series (e.g. "Made in New Jersey"): the episodes the Roku can play, in order.
// Episode video addresses are only included when the viewer has access, and
// are signed (short-lived) like full films.
async function rokuEpisodes(movie: Movie, isUnlocked: boolean) {
    if (isPastAvailableUntil(movie, Date.now())) isUnlocked = false;
    // Any title with episodes counts, even if "series" wasn't switched on in the admin.
    if (!Array.isArray(movie.episodes) || movie.episodes.length === 0) return undefined;
    const playable = movie.episodes.filter(ep => ep && isRokuPlayable(ep.url));
    if (playable.length === 0) return undefined;
    return Promise.all(playable.map(async (ep, i) => {
        let url = '';
        if (isUnlocked) {
            const raw = sanitizeUrl(ep.url);
            url = (await rokuVideoAddress(raw)) || raw;
        }
        const intro = introWindow(movie, ep);
        return {
            id: ep.id || `${movie.key}-ep${i + 1}`,
            title: ep.title || `Episode ${i + 1}`,
            synopsis: (ep.synopsis || '').replace(/<[^>]+>/g, '').trim(),
            duration: ep.duration || 0,
            introStart: intro ? intro.start : 0,
            introEnd: intro ? intro.end : 0,
            url,
        };
    }));
}

function isReleased(movie: Movie | undefined | null): boolean {
    if (!movie || !movie.releaseDateTime) return true;
    const date = toDate(movie.releaseDateTime);
    return !date || date <= new Date();
}

async function formatMovieForRoku(movie: Movie, asset?: RokuAsset, isUnlocked: boolean = false, isLiveOverride: boolean = false, isFestivalOverride: boolean = false): Promise<RokuMovie> {
    // Past its "Hide automatically after" time: nobody gets the film anymore.
    if (isPastAvailableUntil(movie, Date.now())) isUnlocked = false;
    // Not before its release date or its watch party start (api/_lib/filmAvailability.ts).
    if (filmHoldReason(movie, Date.now())) isUnlocked = false;
    const fullStreamUrl = sanitizeUrl(asset?.rokuStreamUrl || movie.rokuStreamUrl || movie.fullMovie || '');
    const trailerUrl = sanitizeUrl(movie.trailer || '');

    // SECURITY: once unlocked, this used to hand back fullStreamUrl (and, further down,
    // movie.fullMovie/movie.rokuStreamUrl again) as-is — a permanent URL that plays forever
    // for anyone who ever captures it, even after a rental expires or access is revoked.
    // Entitlement itself is already correctly checked by the caller (isUnlocked coming in
    // here is trustworthy) — this just makes what's handed back for an unlocked title expire
    // like the web player's signed URL does, instead of being permanent. Falls back to the
    // raw URL if signing fails (missing AWS config, an unrecognized URL shape) rather than
    // breaking playback outright — availability over the marginal expiry improvement here,
    // since the real access gate is the isUnlocked check, not the signature.
    let signedFullStreamUrl = fullStreamUrl;
    if (isUnlocked && fullStreamUrl) {
        const signed = await rokuVideoAddress(fullStreamUrl);
        if (signed) signedFullStreamUrl = signed;
        else console.warn(`[roku-feed] Could not sign stream URL for "${movie.title}" — falling back to raw URL.`);
    }

    // PAYWALL: Only provide full stream URL if content is unlocked
    const streamUrl = isUnlocked ? signedFullStreamUrl : trailerUrl;

    // Log paywall status for debugging
    if (movie.isForSale || movie.isWatchPartyPaid) {
        console.log(`[PAYWALL] Movie "${movie.title}" - isForSale: ${movie.isForSale}, isUnlocked: ${isUnlocked}, streamUrl: ${streamUrl ? 'SET' : 'EMPTY'}`);
    }

    // Checked against the raw (unsigned) URL — a presigned query string doesn't change the
    // underlying file's extension/path, but checking pre-signing avoids any edge case with
    // query-string content interfering with the match.
    const isHls = fullStreamUrl.toLowerCase().includes('.m3u8');
    const posterUrl = sanitizeUrl(asset?.tvPoster || movie.tvPoster || movie.poster || '');
    const heroUrl = sanitizeUrl(asset?.heroImage || movie.rokuHeroImage || movie.tvPoster || movie.poster || '');

    const publishedDate = toDate(movie.publishedAt);
    
    let description = (movie.synopsis || '').replace(/<[^>]+>/g, '').trim();
    if (!isUnlocked && (movie.isForSale || movie.isWatchPartyPaid)) {
        const price = movie.salePrice || movie.watchPartyPrice || 0;
        const priceStr = price > 0 ? ` [$${price.toFixed(2)}]` : '';
        description = `Visit cratetv.net to unlock this title${priceStr}. ${description}`;
    }

    const isMovieFree = isFreeForEveryone(movie, paidKeys);

    // SECURITY: Build response object explicitly - NEVER include fullMovie or rokuStreamUrl for locked content
    return {
        id: movie.key, 
        key: movie.key,
        title: movie.title || 'Untitled',
        description: description,
        synopsis: movie.synopsis,
        // Right-sized copies (api/_lib/imageHosts.ts): tiles are 214 px wide, so never send the multi-megabyte original.
        hdPosterUrl: rokuImageUrl(posterUrl, ROKU_POSTER_WIDTH),
        heroImage: rokuImageUrl(heroUrl, ROKU_HERO_WIDTH),
        poster: rokuImageUrl(movie.poster, ROKU_POSTER_WIDTH),
        tvPoster: rokuImageUrl(movie.tvPoster, ROKU_POSTER_WIDTH),
        // CRITICAL: Only include streamUrl (which is already trailer for locked content)
        // NEVER include fullMovie or rokuStreamUrl directly - the Roku app checks those first!
        streamUrl: streamUrl,
        streamFormat: isHls ? 'hls' : streamUrl.includes('.mpd') ? 'dash' : 'mp4',
        // Only include fullMovie if UNLOCKED - this is the key security fix. Both now carry
        // the same signed (expiring) value as streamUrl above, not the raw permanent one.
        fullMovie: isUnlocked ? signedFullStreamUrl : undefined,
        rokuStreamUrl: isUnlocked ? signedFullStreamUrl : undefined,
        trailer: movie.trailer,
        year: publishedDate ? publishedDate.getFullYear().toString() : '2025',
        runtime: movie.durationInMinutes ? `${movie.durationInMinutes} min` : '',
        durationInMinutes: movie.durationInMinutes,
        director: movie.director,
        cast: movie.cast,
        genres: movie.genres,
        awardName: movie.awardName,
        awardYear: movie.awardYear,
        customLaurelUrl: movie.customLaurelUrl,
        publishedAt: movie.publishedAt,
        isFree: isMovieFree,
        isForSale: movie.isForSale === true,
        isWatchPartyPaid: movie.isWatchPartyPaid === true,
        salePrice: movie.salePrice,
        live: movie.liveStreamStatus === 'live' || movie.isWatchPartyEnabled === true || isLiveOverride,
        isWatchPartyEnabled: movie.isWatchPartyEnabled === true,
        isFestival: isFestivalOverride,
        isUnlocked: isUnlocked,
        // End card after a film (Roku): "Support the filmmaker" shows when the
        // website would offer it (free films with support switched on), and
        // "Read the zine" when the film has one.
        isSupportEnabled: movie.isSupportEnabled !== false,
        zineUrl: (movie as any).zineUrl || '',
        isSeries: movie.isSeries === true || (Array.isArray(movie.episodes) && movie.episodes.length > 0),
        episodes: await rokuEpisodes(movie, isUnlocked),
        purchaseUrl: `https://cratetv.net/movie/${movie.key}?action=buy`
    } as RokuMovie;
}

// One read of the linked account per request (the feed used to read the same
// two documents three times, one after another).
const linkedCache = new Map<string, Promise<{ userId: string; userData: any } | null>>();
function loadLinked(db: any, deviceId: string) {
    let p = linkedCache.get(deviceId);
    if (!p) {
        p = (async () => {
            const linkDoc = await db.collection('roku_links').doc(deviceId).get();
            if (!linkDoc.exists) return null;
            const userId = linkDoc.data()?.userId;
            if (!userId) return null;
            const userDoc = await db.collection('users').doc(userId).get();
            return { userId, userData: userDoc.data() };
        })();
        linkedCache.set(deviceId, p);
        // Short-lived: forget it after 20 seconds so a new link/purchase shows up.
        setTimeout(() => linkedCache.delete(deviceId), 20_000).unref?.();
    }
    return p;
}

// "Crate Intelligence" asks an AI model, which can take seconds. Remember each
// viewer's answer for 6 hours and never wait more than 2.5 s for it.
const recsCache = new Map<string, { at: number; recs: any[] }>();
async function recommendationsFor(userId: string, movies: any[], watchlist: any[], liked: any[]) {
    const hit = recsCache.get(userId);
    if (hit && Date.now() - hit.at < 6 * 60 * 60 * 1000) return hit.recs;
    const work = getAiRecommendations(movies, watchlist, liked).then(recs => { recsCache.set(userId, { at: Date.now(), recs }); return recs; });
    return Promise.race([work, new Promise<any[]>(resolve => setTimeout(() => resolve(hit?.recs || []), 2500))]);
}

const cache = new Map<string, { response: any, timestamp: number }>();
const CACHE_TTL = 20 * 1000; // 20 seconds, so a change in the admin reaches the Roku quickly

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceIdParam = searchParams.get('deviceId');
    const cacheKey = deviceIdParam || 'global';
    const nowTime = Date.now();
    const whyParam = searchParams.get('why');   // /api/roku-feed?why=consumed : explains one film (api/_lib/rokuWhy.ts)

    // Check cache
    const cached = whyParam ? undefined : cache.get(cacheKey);
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

    // (30-second copy is fine here: the whole feed is cached for 20 seconds anyway)
    const apiData = await getApiData();
    paidKeys = paidFestivalFilmKeys(apiData.festivalData);
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
    let liveFestivalDays: any[] | null = null;

    if (db) {
        console.log("Fetching data from Firestore...");
        const [configDoc, assetsSnap, viewsSnap, moviesSnap, categoriesSnap, settingsDoc, configSettingsDoc, partiesSnap, rokuSettingsDoc, festivalDaysSnap] = await Promise.all([
            db.collection('roku').doc('config').get(),
            db.collection('roku_assets').get(),
            db.collection('view_counts').get(),
            db.collection('movies').get(),
            db.collection('categories').get(),
            db.collection('content').doc('settings').get(),
            db.collection('settings').doc('config').get(),
            db.collection('watch_parties').get(),
            db.collection('settings').doc('roku').get(),
            // The LIVE festival schedule. The published copy (apiData.festivalData) only
            // changes when the admin presses Publish, so a film taken out of a block
            // would stay "paid" on the Roku until then.
            db.collection('festival').doc('schedule').collection('days').get().catch(() => null),
        ]);
        if (festivalDaysSnap) {
            liveFestivalDays = (festivalDaysSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() }));
            paidKeys = paidFestivalFilmKeys(liveFestivalDays);
        }

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
            const linked = await loadLinked(db, deviceIdParam);
            if (linked) {
                const userId = linked.userId;
                const userData = linked.userData;
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

                // 4. Watch party tickets (same as the website, api/_lib/entitlements.ts).
                //    Festival films used to count as free on the Roku, so these were
                //    never needed here before Oct 23 2026. Day passes are covered by
                //    the dated block unlocks above; the old day NUMBER ("day 1") isn't
                //    used, since it would open day 1 of every future festival.
                const partyKeys: string[] = Array.isArray(userData?.unlockedWatchPartyKeys) ? userData.unlockedWatchPartyKeys : [];
                partyKeys.forEach(k => unlockedMovies.add(k));
                if (partyKeys.length > 0) {
                    if (!festSnap) festSnap = await db.collection('festival').doc('schedule').collection('days').get();
                    const partyKeySet = new Set(partyKeys);
                    festSnap.forEach((doc: any) => {
                        const day = doc.data();
                        day.blocks?.forEach((block: any) => {
                            if (partyKeySet.has(block.id)) {
                                block.movieKeys?.forEach((k: string) => unlockedMovies.add(k));
                            }
                        });
                    });
                }

                // Jury pass: everything (same as the website, api/_lib/entitlements.ts).
                if (userData?.hasJuryPass) unlockedMovies.add('ALL');

                // FIX (Oct 2026): a festival pass and a Crate Fest pass used to add
                // 'ALL' here, which unlocked EVERY paid film on Crate on the Roku,
                // e.g. a 48-hour rental kept playing forever for a pass holder.
                // The website only lets these passes open their own festival's
                // films, so the Roku now does the same.
                const nowDate = new Date();
                // One festival only: an old pass with no end date no longer counts.
                const festivalPassActive = isFestivalPassActive(userData, nowDate.getTime());
                if (festivalPassActive) {
                    if (!festSnap) festSnap = await db.collection('festival').doc('schedule').collection('days').get();
                    // The PWFF schedule only (same rule as the website): old days left in the
                    // schedule and partner festivals are not opened by the pass.
                    const pwffDays = selectPwffDays((festSnap.docs as any[]).map((doc: any) => doc.data() || {}));
                    pwffDays.forEach((day: any) => {
                        day.blocks?.forEach((block: any) => {
                            if (!isOutsidePartner(block.partnerId || day.partnerId)) {
                                block.movieKeys?.forEach((k: string) => unlockedMovies.add(k));
                            }
                        });
                    });
                }
                const crateFestPassActive = userData?.crateFestPassExpiry
                    ? (toDate(userData.crateFestPassExpiry) || new Date(0)) > nowDate
                    : userData?.hasCrateFestPass === true;
                if (crateFestPassActive) {
                    const blocks = (config as any).crateFest?.movieBlocks || [];
                    blocks.forEach((b: any) => (b.movieKeys || []).forEach((k: string) => unlockedMovies.add(k)));
                }
            }
        }
    }

    const categories: any[] = [];
    const publicSquare: any[] = [];
    const holidayModeOn = (apiData as any)?.settings?.isHolidayModeActive === true;

    // Films whose video file is gone from storage are left out (never a Top Ten
    // tile that only says "loading"). See api/_lib/videoExists.ts.
    const noVideo = await findFilmsWithoutVideo(
        (Object.values(moviesObj) as Movie[]).map(m => ({ key: m.key, address: sanitizeUrl(assets[m.key]?.rokuStreamUrl || m.rokuStreamUrl || m.fullMovie || ''), liveStreamUrl: m.liveStreamUrl, episodes: m.episodes })),
        storageKeyCheck()).catch(() => new Set<string>());

    if (whyParam) {
        const film = findFilm(moviesObj as Record<string, any>, whyParam);
        const address = film ? sanitizeUrl(assets[film.key]?.rokuStreamUrl || film.rokuStreamUrl || film.fullMovie || '') : '';
        const body = film
            ? (() => { const r: any = explainFilm({
                movie: film, festivalDays: liveFestivalDays || (Array.isArray(apiData.festivalData) ? apiData.festivalData : []), nowMs: Date.now(),
                inPaidKeys: paidKeys.has(film.key), hasVideoAddress: !!address || !!film.liveStreamUrl || (Array.isArray(film.episodes) && film.episodes.length > 0),
                videoMissing: noVideo.has(film.key), rokuOverrideAddress: assets[film.key]?.rokuStreamUrl || undefined,
            }); r.rows = explainPlacement(film.key, categoriesObj as any, config, holidayModeOn); return r; })()
            : { film: null, message: `No film found for "${whyParam}". Try the film's key or its exact title.` };
        return new Response(JSON.stringify(body, null, 2), { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    const isValidForRoku = (m: Movie, isLiveOverride: boolean = false) => {
        if (!m) return false;
        if (m.key && noVideo.has(m.key)) { console.log(`Movie rejected for Roku [${m.key}]: video file is missing from storage`); return false; }
        const hasTitle = !!m.title;
        const hasPoster = !!m.poster || !!m.tvPoster || !!m.rokuHeroImage;
        const isNotUnlisted = !m.isUnlisted && !isPastAvailableUntil(m, Date.now());
        const released = isReleased(m) || isLiveOverride;
        // Something the Roku can actually play: a video file (not a YouTube/Vimeo
        // link), a live stream, or, for a series, at least one playable episode.
        const hasStream = isRokuPlayable(m.rokuStreamUrl) || isRokuPlayable(m.fullMovie) || !!m.liveStreamUrl
            || (Array.isArray(m.episodes) && m.episodes.some(ep => ep && isRokuPlayable(ep.url)));
        
        const valid = hasTitle && hasPoster && isNotUnlisted && released && hasStream;
        
        if (!valid) {
            // Log rejection reason for debugging
            console.log(`Movie rejected for Roku [${m.key || 'unknown'}]: title:${hasTitle}, poster:${hasPoster}, unlisted:${!isNotUnlisted}, released:${released}, stream:${hasStream}`);
        }
        return valid;
    };

    // Auto-calculate PWFF annual edition number (PWFF founded 2013)
    function getPwffEdition(year: number): string {
        const edition = year - 2013 + 1;
        const s = ['th','st','nd','rd'];
        const v = edition % 100;
        return edition + (s[(v-20)%10] || s[v] || s[0]);
    }

    // 1. PWFF / CRATE FEST (Highest Priority — goes FIRST when festival is live)
    if ((config as any).crateFest) {
        const fest = (config as any).crateFest;
        const isLive = fest.isLive === true;
        const movieKeys = fest.movieBlocks?.flatMap((b: any) => b.movieKeys) || [];
        const children = await Promise.all(movieKeys
            .map((k: string) => moviesObj[k])
            .filter((m: Movie) => m && isValidForRoku(m, true))
            .map((m: Movie) => {
                const isMovieFree = isFreeForEveryone(m, paidKeys);
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked, isLive, true);
            }));
        
        if (children.length > 0) {
            // Auto-generate title with annual number
            const festYear = new Date().getFullYear();
            const edition = getPwffEdition(festYear);
            const festTitle = fest.title || ('Playhouse West Film Festival — ' + edition + ' Annual');
            categories.unshift({  // unshift = insert at position 0 (FIRST row)
                title: festTitle,
                type: 'standard',
                categoryType: 'crateFest',
                festivalIsLive: isLive,
                children
            });
        }
    }

    // 1b. WATCH PARTIES (Oct 2026). Upcoming and live film watch parties get
    // their own row near the top. The Roku app finds the party to join by
    // scanning the rows for a watch-party film, so before this a party only
    // showed up on the TV if its film happened to be in another row (and
    // not if it wasn't "released" yet, e.g. a premiere).
    {
        const nowMs = Date.now();
        const tzFmt = (ms: number) => new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' });
        const partyFilms = (Object.values(moviesObj) as Movie[])
            .filter(m => {
                if (!m || m.isWatchPartyEnabled !== true || !m.watchPartyStartTime) return false;
                const start = Date.parse(m.watchPartyStartTime);
                const live = !!(config as any).activeParties?.[m.key] && !isStaleLive((config as any).activeParties[m.key], Date.parse(m.watchPartyStartTime || ''));
                if (!live && !(Number.isFinite(start) && start > nowMs - 6 * 3600_000 && start < nowMs + 30 * 86400_000)) return false;
                // A premiere film kept hidden from the catalog still gets its party row.
                return isWatchPartyListable(m, nowMs) && isValidForRoku({ ...m, isUnlisted: false } as Movie, true);
            })
            .sort((a, b) => Date.parse(a.watchPartyStartTime!) - Date.parse(b.watchPartyStartTime!));
        const children = await Promise.all(partyFilms.map(async m => {
            const isMovieFree = isFreeForEveryone(m, paidKeys);
            const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
            const item: any = await formatMovieForRoku(m, assets[m.key], isUnlocked, true);
            const live = !!(config as any).activeParties?.[m.key] && !isStaleLive((config as any).activeParties[m.key], Date.parse(m.watchPartyStartTime || ''));
            const when = live ? 'LIVE NOW' : `Watch party · ${tzFmt(Date.parse(m.watchPartyStartTime!))}`;
            item.description = `${when}. ${item.description || ''}`.trim();
            return item;
        }));
        if (children.length > 0) {
            const at = (config as any).crateFest && categories.length > 0 ? 1 : 0;
            categories.splice(at, 0, { title: 'Watch Parties', type: 'standard', categoryType: 'watchParty', children });
        }
    }

    // 2. PREMIER ACCESS (Paid Content)
    const premierMovies = await Promise.all((Object.values(moviesObj) as Movie[])
        .filter(m => isValidForRoku(m) && (m.isForSale || m.isWatchPartyPaid))
        .sort((a, b) => {
            const dateA = toDate(a.publishedAt) || new Date(0);
            const dateB = toDate(b.publishedAt) || new Date(0);
            return dateB.getTime() - dateA.getTime();
        })
        .map(m => {
            const isMovieFree = isFreeForEveryone(m, paidKeys);
            const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
            return formatMovieForRoku(m, assets[m.key], isUnlocked);
        }));

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
        // Same ranking as the website (api/_lib/topTen.ts); then only films the Roku can play.
        const topMovies = await Promise.all(rankByViews(Object.values(moviesObj) as Movie[], viewCounts, Date.now())
            .filter(m => isValidForRoku(m))
            .slice(0, 10)
            .map(m => {
                const isMovieFree = isFreeForEveryone(m, paidKeys);
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            }));

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
            const linked = await loadLinked(db, deviceIdParam);
            if (linked) {
                const userId = linked.userId;
                const userData = linked.userData;
                
                if (userData) {
                    // CONTINUE WATCHING
                    if (userData.playbackProgress) {
                        const continueWatchingMovies = await Promise.all(Object.entries(userData.playbackProgress as Record<string, number>)
                            .filter(([key, progress]) => progress > 0 && !(userData.watchedMovies || []).includes(key))
                            .sort((a, b) => b[1] - a[1])
                            .map(([key]) => moviesObj[key])
                            .filter((m: Movie) => m && isValidForRoku(m))
                            .slice(0, 10)
                            .map((m: Movie) => {
                                const isMovieFree = isFreeForEveryone(m, paidKeys);
                                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                                return formatMovieForRoku(m, assets[m.key], isUnlocked);
                            }));

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
                        const watchlistMovies = await Promise.all(userData.watchlist
                            .map((k: string) => moviesObj[k])
                            .filter((m: Movie) => m && isValidForRoku(m))
                            .map((m: Movie) => {
                                const isMovieFree = isFreeForEveryone(m, paidKeys);
                                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                                return formatMovieForRoku(m, assets[m.key], isUnlocked);
                            }));

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
            const linked = await loadLinked(db, deviceIdParam);
            if (linked) {
                const userId = linked.userId;
                const userData = linked.userData;
                if (userData) {
                    const recommendations = await recommendationsFor(
                        userId,
                        Object.values(moviesObj),
                        userData.watchlist || [],
                        userData.likedMovies || []
                    );

                    if (recommendations.length > 0) {
                        const recMovies = await Promise.all(recommendations
                            .map(r => moviesObj[r.movieKey])
                            .filter(m => isValidForRoku(m))
                            .map(m => {
                                const isMovieFree = isFreeForEveryone(m, paidKeys);
                                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                                return formatMovieForRoku(m, assets[m.key], isUnlocked);
                            }));

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
    // Converted from .forEach() to a for...of loop — .forEach() can't await, and
    // formatMovieForRoku() below is now async (it signs unlocked stream URLs).
    console.log(`Processing ${Object.keys(categoriesObj).length} categories...`);
    for (const [key, cat] of Object.entries(categoriesObj) as [string, any][]) {
        // Same rows as the website: skip the ones it never shows as an ordinary row.
        if (isHeldBackCategory(key, cat.title, holidayModeOn) || (config.categories?.hidden || []).includes(key)) continue;

        const movieKeys = cat.movieKeys || [];
        const children = await Promise.all(movieKeys
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
                const isMovieFree = isFreeForEveryone(movie, paidKeys);
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(movie.key) || isMovieFree;
                return formatMovieForRoku(movie, assets[movie.key], isUnlocked);
            }));

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
    }

    // FALLBACK: If no categories were populated but we have valid movies, show them all
    if (categories.length === 0 && publicSquare.length === 0) {
        console.log("No categories populated. Checking for any valid movies to show in fallback 'Library' category...");
        const allValidMovies = await Promise.all((Object.values(moviesObj) as Movie[])
            .filter(m => isValidForRoku(m))
            .map((m: Movie) => {
                const isMovieFree = isFreeForEveryone(m, paidKeys);
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            }));
        
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

    // 6. HERO SELECTION (Requirement 2.1)
    let heroItems: RokuMovie[] = [];
    if (config.hero?.mode === 'manual' && Array.isArray(config.hero.items) && config.hero.items.length > 0) {
        console.log(`Using manual hero selection with ${config.hero.items.length} items.`);
        heroItems = await Promise.all(config.hero.items
            .sort((a, b) => a.order - b.order)
            .map(item => moviesObj[item.movieKey])
            .filter(m => m && isValidForRoku(m))
            .map(m => {
                const isMovieFree = isFreeForEveryone(m, paidKeys);
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            }));
    }

    // Intelligent Fallback if manual is empty or mode is auto
    if (heroItems.length === 0) {
        console.log("Using intelligent fallback for hero selection (Top Views).");
        const topViewedMovies = await Promise.all((Object.values(moviesObj) as Movie[])
            .filter(m => isValidForRoku(m))
            .sort((a, b) => (viewCounts[b.key] || 0) - (viewCounts[a.key] || 0))
            .slice(0, 5)
            .map(m => {
                const isMovieFree = isFreeForEveryone(m, paidKeys);
                const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
                return formatMovieForRoku(m, assets[m.key], isUnlocked);
            }));
        
        if (topViewedMovies.length > 0) {
            heroItems = topViewedMovies;
        } else {
            // Absolute fallback: first category children
            heroItems = (categories[0]?.children || publicSquare[0]?.children || []).slice(0, 5);
        }
    }

    const liveNow = await Promise.all((Object.values(moviesObj) as Movie[])
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
            const isMovieFree = isFreeForEveryone(m, paidKeys);
            const isUnlocked = unlockedMovies.has('ALL') || unlockedMovies.has(m.key) || isMovieFree;
            return formatMovieForRoku(m, assets[m.key], isUnlocked, isCrateFest || isExplicitlyLive, isCrateFest);
        }));

    // The linked viewer's watch streak + badges, for the Roku Account page.
    // Just for fun: never unlocks anything. Skipped quietly on any error.
    let viewer: { streakMonths: number; bestMonths: number; badges: string[] } | undefined;
    if (deviceIdParam) {
        try {
            const db = getAdminDb();
            const link = db ? (await db.collection('roku_links').doc(deviceIdParam).get()).data() : null;
            if (db && link?.userId) {
                const sum = await streakSummary(db, link.userId);
                viewer = {
                    streakMonths: sum.monthly.current,
                    bestMonths: sum.monthly.best,
                    badges: sum.badges.slice(0, 4).map(b => b.label),
                };
            }
        } catch (e) {
            console.warn('[roku-feed] streak summary skipped:', e);
        }
    }

    const response: RokuFeed = {
        viewer,
        version: Date.now(),
        timestamp: new Date().toISOString(),
        announcement: (config as any).announcement || '',
        heroItems,
        categories,
        publicSquare,
        liveNow
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
