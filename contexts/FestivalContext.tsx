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
    const [activeParties, setActiveParties] = useState<Record<string, WatchPartyState>>({});
    const [allPartyStates, setAllPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000); // Update every second for smooth transitions
        return () => clearInterval(timer);
    }, []);

    const isFestivalLive = useMemo(() => {
        // Portal Access toggle is the primary gate — if OFF, never live
        if (!festivalConfig?.isFestivalLive) return false;
        // If toggle is ON but no dates are set, go live immediately
        if (!festivalConfig?.startDate || !festivalConfig?.endDate) return true;
        // If toggle is ON and dates are set, check the date range
        const nowTime = now.getTime();
        const start = new Date(festivalConfig.startDate).getTime();
        const end = new Date(festivalConfig.endDate).getTime();
        return nowTime >= start && nowTime < end;
    }, [festivalConfig, now]);

    const livePartyMovie = useMemo(() => {
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
            return m ? !m.isUnlisted : true;
        });

        if (liveKey) {
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

        // 2. Fallback to FUTURE scheduled parties only
        // Key fix: Do NOT show any party whose start time has passed unless it's explicitly live (handled above)
        const upcomingParties = movieArray
            .filter(m => m.isWatchPartyEnabled && m.watchPartyStartTime && !m.isUnlisted)
            .filter(m => {
                const start = new Date(m.watchPartyStartTime!);
                const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
                
                // CRITICAL: If start time has passed, DO NOT show it
                // The party should only show as "upcoming" if it's in the FUTURE
                if (start.getTime() <= now.getTime()) return false;
                
                // Don't show if party was explicitly ended
                const partyState = allPartyStates[m.key];
                if (partyState?.status === 'ended') return false;
                
                // Show if it's starting in the next 7 days
                return start.getTime() < (now.getTime() + sevenDaysInMs);
            })
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        // Debug logging
        const watchPartyMovies = movieArray.filter(m => m.isWatchPartyEnabled);
        if (watchPartyMovies.length > 0) {
            console.log('[WATCH PARTY DEBUG] Movies with isWatchPartyEnabled:', watchPartyMovies.map(m => ({
                key: m.key,
                title: m.title,
                watchPartyStartTime: m.watchPartyStartTime,
                isUpcoming: m.watchPartyStartTime ? new Date(m.watchPartyStartTime).getTime() > now.getTime() : false
            })));
        }
        if (upcomingParties.length > 0) {
            console.log('[WATCH PARTY DEBUG] Upcoming parties found:', upcomingParties[0]?.title);
        }

        return upcomingParties[0] || null;
    }, [activeParties, allPartyStates, movies, festivalData, now, settings]);

    const fetchData = async (forceNoCache = false) => {
        try {
            const res = await fetch(`/api/get-live-data?t=${Date.now()}&noCache=${forceNoCache}`);
            if (res.ok) {
                const data = await res.json();
                if (data.movies) {
                    // DEBUG: Log movies with watch party enabled
                    const wpMovies = Object.values(data.movies).filter((m: any) => m.isWatchPartyEnabled);
                    if (wpMovies.length > 0) {
                        console.log('[FESTIVAL CONTEXT] Movies from API with isWatchPartyEnabled:', wpMovies.map((m: any) => ({
                            key: m.key,
                            title: m.title,
                            isWatchPartyEnabled: m.isWatchPartyEnabled,
                            watchPartyStartTime: m.watchPartyStartTime
                        })));
                    } else {
                        console.log('[FESTIVAL CONTEXT] No movies from API have isWatchPartyEnabled=true');
                    }
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
        
        const init = async () => {
            await initializeFirebaseAuth();
            const db = getDbInstance();
            if (db) {
                // REAL-TIME MOVIES LISTENER - for watch party settings
                db.collection('data').doc('movies').onSnapshot(doc => {
                    if (doc.exists) {
                        const firebaseMovies = doc.data() as Record<string, Movie>;
                        // Merge watch party fields from Firebase into movies state
                        setMovies(prev => {
                            const merged = { ...prev };
                            Object.entries(firebaseMovies).forEach(([key, fbMovie]) => {
                                if (merged[key]) {
                                    // Update watch party fields from Firebase (real-time)
                                    merged[key] = {
                                        ...merged[key],
                                        isWatchPartyEnabled: fbMovie.isWatchPartyEnabled,
                                        watchPartyStartTime: fbMovie.watchPartyStartTime,
                                        isWatchPartyPaid: fbMovie.isWatchPartyPaid,
                                        watchPartyPrice: fbMovie.watchPartyPrice
                                    };
                                }
                            });
                            return merged;
                        });
                    }
                });

                // REAL-TIME VIEW COUNT LISTENER
                db.collection('view_counts').onSnapshot(snapshot => {
                    const counts: Record<string, number> = {};
                    snapshot.forEach(doc => {
                        counts[doc.id] = doc.data().count || 0;
                    });
                    setViewCounts(counts);
                });

                db.collection('content').doc('settings').onSnapshot(doc => {
                    if (doc.exists) setSettings(doc.data() as SiteSettings);
                });

                db.collection('festival').doc('config').onSnapshot(doc => {
                    if (doc.exists) setFestivalConfig(doc.data() as FestivalConfig);
                });

                db.collection('festival').doc('schedule').collection('days').onSnapshot(snap => {
                    if (!snap.empty) {
                        const days: FestivalDay[] = [];
                        snap.forEach(doc => {
                            const data = doc.data() as FestivalDay;
                            days.push(data);
                        });
                        setFestivalData(days.filter(d => d && d.day).sort((a, b) => a.day - b.day));
                    }
                });

                db.collection('movie_pipeline').onSnapshot(snapshot => {
                    const entries: MoviePipelineEntry[] = [];
                    snapshot.forEach(doc => {
                        entries.push({ id: doc.id, ...doc.data() } as MoviePipelineEntry);
                    });
                    setPipeline(entries);
                });

                db.collection('watch_parties').onSnapshot(snapshot => {
                    const liveStates: Record<string, WatchPartyState> = {};
                    const allStates: Record<string, WatchPartyState> = {};
                    snapshot.forEach(doc => {
                        const data = doc.data() as WatchPartyState;
                        allStates[doc.id] = data;
                        if (data.status === 'live') {
                            liveStates[doc.id] = data;
                        }
                    });
                    setActiveParties(liveStates);
                    setAllPartyStates(allStates);
                });
            }
        };
        init();
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