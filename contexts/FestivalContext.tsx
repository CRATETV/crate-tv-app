import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { initializeFirebaseAuth, getDbInstance } from '../services/firebaseClient';
import { Movie, Category, FestivalConfig, FestivalDay, AboutData, AdConfig, SiteSettings, MoviePipelineEntry, AnalyticsData, WatchPartyState, EditorialStory } from '../types';
import { moviesData, categoriesData, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig, aboutData as initialAboutData } from '../constants';

interface FestivalContextType {
    isLoading: boolean;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    zineStories: EditorialStory[];
    festivalConfig: FestivalConfig | null;
    festivalData: FestivalDay[];
    aboutData: AboutData | null;
    isFestivalLive: boolean;
    dataSource: 'live' | 'fallback' | null;
    adConfig: AdConfig | null;
    settings: SiteSettings;
    pipeline: MoviePipelineEntry[];
    analytics: AnalyticsData | null;
    viewCounts: Record<string, number>;
    activeParties: Record<string, WatchPartyState>;
    allPartyStates: Record<string, WatchPartyState>; // All parties including ended ones
    livePartyMovie: Movie | null;
    refreshData: () => Promise<void>;
}

const FestivalContext = createContext<FestivalContextType | undefined>(undefined);

export const useFestival = () => {
    const context = useContext(FestivalContext);
    if (context === undefined) {
        throw new Error('useFestival must be used within a FestivalProvider');
    }
    return context;
};

export const FestivalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>(moviesData);
    const [categories, setCategories] = useState<Record<string, Category>>(categoriesData);
    const [zineStories, setZineStories] = useState<EditorialStory[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(initialFestivalConfig);
    const [festivalData, setFestivalData] = useState<FestivalDay[]>(initialFestivalData);
    const [aboutData, setAboutData] = useState<AboutData | null>(initialAboutData);
    const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
    const [settings, setSettings] = useState<SiteSettings>({ isHolidayModeActive: false });
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
    const [scheduledParties, setScheduledParties] = useState<Record<string, any>>({});
    const [activeParties, setActiveParties] = useState<Record<string, WatchPartyState>>({});
    const [allPartyStates, setAllPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // Tick every 10s — ensures banner shows promptly when party goes live
        const timer = setInterval(() => setNow(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    const isFestivalLive = useMemo(() => {
        // Portal Access toggle is the primary gate — if OFF, never live
        if (!festivalConfig?.isFestivalLive) return false;
        // If toggle is ON but no dates are set, do NOT go live — dates required
        if (!festivalConfig?.startDate || !festivalConfig?.endDate) return false;
        // If toggle is ON and dates are set, check the date range
        const nowTime = now.getTime();
        const start = new Date(festivalConfig.startDate).getTime();
        const end = new Date(festivalConfig.endDate).getTime();
        return nowTime >= start && nowTime < end;
    }, [festivalConfig, now]);

    const livePartyMovie = useMemo(() => {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
        const twoHoursInMs = 24 * 60 * 60 * 1000; // 24 hours post-start window

        // ── PRIORITY 0: Check dedicated real-time schedule (instant, no S3 delay) ──
        // This fires the moment admin saves a watch party time
        const scheduleEntries = Object.values(scheduledParties)
            .filter((s: any) => {
                if (!s.isWatchPartyEnabled) return false;
                if (allPartyStates[s.movieKey]?.status === 'ended') return false;
                if (activeParties[s.movieKey]?.status === 'live') return false;
                if (!s.watchPartyStartTime) return false;
                const start = new Date(s.watchPartyStartTime).getTime();
                if (start > now.getTime() && start < now.getTime() + sevenDaysInMs) return true;
                if (start <= now.getTime() && now.getTime() - start < twoHoursInMs) return true;
                return false;
            })
            .sort((a: any, b: any) => new Date(a.watchPartyStartTime).getTime() - new Date(b.watchPartyStartTime).getTime());

        if (scheduleEntries.length > 0) {
            const s = scheduleEntries[0] as any;
            // Merge with full movie data if available
            const fullMovie = movies[s.movieKey];
            return {
                ...(fullMovie || {}),
                key: s.movieKey,
                title: s.movieTitle || fullMovie?.title || 'Upcoming Event',
                watchPartyStartTime: s.watchPartyStartTime,
                isWatchPartyEnabled: true,
                isWatchPartyPaid: s.isWatchPartyPaid || false,
                watchPartyPrice: s.watchPartyPrice || 0,
                poster: s.poster || fullMovie?.poster || '',
                director: fullMovie?.director || 'Festival Event',
                synopsis: fullMovie?.synopsis || '',
                cast: fullMovie?.cast || [],
                trailer: fullMovie?.trailer || '',
                fullMovie: fullMovie?.fullMovie || '',
                tvPoster: fullMovie?.tvPoster || '',
                likes: fullMovie?.likes || 0,
            } as Movie;
        }

        const movieArray = Object.values(movies) as Movie[];
        
        // 1. Check for explicitly LIVE parties first (highest priority)
        // Sort by actualStartTime to ensure the most recently started party is picked
        const liveKeys = Object.keys(activeParties).sort((a, b) => {
            const timeA = activeParties[a].actualStartTime?.seconds || 0;
            const timeB = activeParties[b].actualStartTime?.seconds || 0;
            return timeB - timeA;
        });

        const liveKey = liveKeys.find(key => {
            const m = movies[key];
            // Only trigger banner if the movie actually exists in the catalog
            // Stale watch_parties documents for deleted/missing movies should be ignored
            if (!m) return false;
            return !m.isUnlisted;
        });

        if (liveKey && movies[liveKey]) {
            if (movies[liveKey]) return movies[liveKey];
            
            // Fallback: Check if it's a festival block
            let block = festivalData.flatMap(d => d.blocks).find(b => b.id === liveKey);
            
            // Check Crate Fest blocks if not found
            if (!block && settings.crateFestConfig?.movieBlocks) {
                block = settings.crateFestConfig.movieBlocks.find(b => b.id === liveKey);
            }

            if (block) {
                // Synthesize a movie-like object for the banner to render
                return {
                    key: block.id,
                    title: block.title,
                    watchPartyStartTime: block.watchPartyStartTime,
                    isWatchPartyEnabled: true,
                    isWatchPartyPaid: (block.price || 0) > 0,
                    watchPartyPrice: block.price,
                    poster: '', // Blocks might not have posters, banner handles empty
                    director: 'Festival Event'
                } as Movie;
            }
        }

        // 2. Fallback: any enabled watch party that is not ended
        // Show banner if isWatchPartyEnabled=true, regardless of whether a start time is set
        const upcomingParties = movieArray
            .filter(m => m.isWatchPartyEnabled && !m.isUnlisted)
            .filter(m => {
                // Don't show if party was explicitly ended AND no future start time
                const partyState = allPartyStates[m.key];
                
                // If ended but has a FUTURE start time set — ignore the ended status
                // This handles the case where admin ended a test and scheduled a new one
                if (partyState?.status === 'ended' && m.watchPartyStartTime) {
                    const start = new Date(m.watchPartyStartTime);
                    if (start.getTime() > now.getTime()) {
                        // Has a future start time — stale ended doc should not block banner
                    } else {
                        return false;
                    }
                } else if (partyState?.status === 'ended') {
                    return false;
                }
                // Don't show if already live (handled above)
                if (activeParties[m.key]?.status === 'live') return false;

                // If no start time set — don't show banner (nothing to count down to)
                if (!m.watchPartyStartTime) return false;

                const start = new Date(m.watchPartyStartTime);
                const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
                const postStartWindow = 24 * 60 * 60 * 1000; // 24 hours

                // Show if in future within 7 days
                if (start.getTime() > now.getTime() && start.getTime() < (now.getTime() + sevenDaysInMs)) return true;

                // Also show for up to 24 hours after scheduled start
                if (start.getTime() <= now.getTime() && now.getTime() - start.getTime() < postStartWindow) return true;

                return false;
            })
            .sort((a, b) => {
                // No start time goes last
                if (!a.watchPartyStartTime) return 1;
                if (!b.watchPartyStartTime) return -1;
                return new Date(a.watchPartyStartTime).getTime() - new Date(b.watchPartyStartTime).getTime();
            });



        if (upcomingParties[0]) return upcomingParties[0];

        // 3. Check festival BLOCKS for upcoming watch parties
        // (blocks are NOT in movieArray — they live in festivalData)
        const allBlocks = festivalData.flatMap(d => d.blocks);
        const upcomingBlocks = allBlocks
            .filter(block => {
                if (!block.isWatchPartyEnabled) return false;
                // Skip if already live
                if (activeParties[block.id]?.status === 'live') return false;
                // Skip if ended
                if (allPartyStates[block.id]?.status === 'ended') return false;
                // Must have a start time set
                if (!block.watchPartyStartTime) return false;

                const start = new Date(block.watchPartyStartTime);
                const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
                const twoHoursInMs = 2 * 60 * 60 * 1000;

                // Show if starting within 7 days
                if (start.getTime() > now.getTime() && start.getTime() < (now.getTime() + sevenDaysInMs)) return true;
                // Show for up to 2 hours after scheduled start
                if (start.getTime() <= now.getTime() && now.getTime() - start.getTime() < twoHoursInMs) return true;

                return false;
            })
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        if (upcomingBlocks.length > 0) {
            const block = upcomingBlocks[0];
            const firstFilm = movies[block.movieKeys?.[0]];
            return {
                key: block.id,
                title: block.title,
                watchPartyStartTime: block.watchPartyStartTime,
                isWatchPartyEnabled: true,
                isWatchPartyPaid: (block.price || 0) > 0,
                watchPartyPrice: block.price,
                poster: firstFilm?.poster || '',
                director: firstFilm?.director || 'Festival Event',
                synopsis: '',
                cast: [],
                trailer: '',
                fullMovie: '',
                tvPoster: '',
                likes: 0,
            } as Movie;
        }

        return null;
    }, [activeParties, allPartyStates, movies, festivalData, now, settings, scheduledParties]);

    const fetchData = async (forceNoCache = false) => {
        try {
            const res = await fetch(`/api/get-live-data?t=${Date.now()}&noCache=${forceNoCache}`);
            if (res.ok) {
                const data = await res.json();
                if (data.movies) {
                    setMovies(data.movies);
                }
                if (data.categories) setCategories(data.categories);
                if (data.zineStories) setZineStories(data.zineStories);
                if (data.aboutData) setAboutData(data.aboutData);
                // ── CRITICAL: set festivalConfig from API so it doesn't rely
                //    solely on the client-side onSnapshot which can fail silently
                if (data.festivalConfig) setFestivalConfig(data.festivalConfig);
                if (data.festivalData && Array.isArray(data.festivalData)) setFestivalData(data.festivalData);
                setDataSource('live');
            }
        } catch (err) {
            console.error("Live manifest fetch failed, using local fallback.", err);
            setDataSource('fallback');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const unsubs: (() => void)[] = [];

        const init = async () => {
            const auth = await initializeFirebaseAuth();
            const db = getDbInstance();
            if (!db) return;

            // Movies — watch party fields
            unsubs.push(db.collection('data').doc('movies').onSnapshot(doc => {
                if (!doc.exists) return;
                const firebaseMovies = doc.data() as Record<string, Movie>;
                setMovies(prev => {
                    const merged = { ...prev };
                    Object.entries(firebaseMovies).forEach(([key, fbMovie]) => {
                        if (merged[key]) {
                            merged[key] = {
                                ...merged[key],
                                isWatchPartyEnabled: fbMovie.isWatchPartyEnabled ?? merged[key].isWatchPartyEnabled,
                                watchPartyStartTime: fbMovie.watchPartyStartTime ?? merged[key].watchPartyStartTime,
                                isWatchPartyPaid: fbMovie.isWatchPartyPaid ?? merged[key].isWatchPartyPaid,
                                watchPartyPrice: fbMovie.watchPartyPrice ?? merged[key].watchPartyPrice,
                            };
                        } else {
                            merged[key] = fbMovie;
                        }
                    });
                    return merged;
                });
            }));

            // View counts
            unsubs.push(db.collection('view_counts').onSnapshot(snapshot => {
                const counts: Record<string, number> = {};
                snapshot.forEach(doc => { counts[doc.id] = doc.data().count || 0; });
                setViewCounts(counts);
            }, () => {}));

            // Site settings — public read, no auth needed
            unsubs.push(db.collection('content').doc('settings').onSnapshot(doc => {
                if (doc.exists) setSettings(doc.data() as SiteSettings);
            }, (err) => {
                console.warn('[FestivalContext] settings read blocked:', err.code, '— check Firebase rules');
            }));

            // Festival config — public read, no auth needed
            unsubs.push(db.collection('festival').doc('config').onSnapshot(doc => {
                if (doc.exists) setFestivalConfig(doc.data() as FestivalConfig);
            }, (err) => {
                console.warn('[FestivalContext] festival/config read blocked:', err.code, '— check Firebase rules');
            }));

            // Festival schedule days — public read
            unsubs.push(db.collection('festival').doc('schedule').collection('days').onSnapshot(snap => {
                if (!snap.empty) {
                    const days: FestivalDay[] = [];
                    snap.forEach(doc => days.push(doc.data() as FestivalDay));
                    setFestivalData(days.filter(d => d?.day).sort((a, b) => a.day - b.day));
                }
            }, (err) => {
                console.warn('[FestivalContext] festival/schedule read blocked:', err.code, '— check Firebase rules');
            }));

            // Movie pipeline
            unsubs.push(db.collection('movie_pipeline').onSnapshot(snapshot => {
                const entries: MoviePipelineEntry[] = [];
                snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as MoviePipelineEntry));
                setPipeline(entries);
            }, () => {}));

            // Watch party schedule — instant banner
            unsubs.push(db.collection('watch_party_schedule').onSnapshot(snapshot => {
                const scheduled: Record<string, any> = {};
                snapshot.forEach(doc => { scheduled[doc.id] = doc.data(); });
                setScheduledParties(scheduled);
            }, () => {}));

            // Watch parties — live status
            const subscribeWatchParties = () => db.collection('watch_parties').onSnapshot(snapshot => {
                const liveStates: Record<string, WatchPartyState> = {};
                const allStates: Record<string, WatchPartyState> = {};
                snapshot.forEach(doc => {
                    const data = doc.data() as WatchPartyState;
                    allStates[doc.id] = data;
                    if (data.status === 'live') liveStates[doc.id] = data;
                });
                setActiveParties(liveStates);
                setAllPartyStates(allStates);
            }, () => {});

            unsubs.push(subscribeWatchParties());

            // Watchdog — resubscribe every 90s to prevent silent listener failure
            // This ensures the banner appears promptly when a party goes live
            let watchPartyUnsub = subscribeWatchParties();
            const watchdog = setInterval(() => {
                watchPartyUnsub();
                watchPartyUnsub = subscribeWatchParties();
            }, 90000);
            unsubs.push(() => { clearInterval(watchdog); watchPartyUnsub(); });

            // Re-subscribe on auth change to pick up permission upgrades
            if (auth) {
                auth.onAuthStateChanged(user => {
                    if (user) unsubs.push(subscribeWatchParties());
                });
            }
        };

        init();

        return () => { unsubs.forEach(fn => fn()); };
    }, []);

    const value: FestivalContextType = {
        isLoading,
        movies,
        categories,
        zineStories,
        festivalConfig,
        festivalData,
        aboutData,
        isFestivalLive,
        dataSource,
        adConfig,
        settings,
        pipeline,
        analytics,
        viewCounts,
        activeParties,
        allPartyStates,
        livePartyMovie,
        refreshData: () => fetchData(true)
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};