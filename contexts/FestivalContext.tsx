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
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);

    const isFestivalLive = useMemo(() => {
        if (!festivalConfig?.startDate || !festivalConfig?.endDate) return false;
        const now = new Date().getTime();
        const start = new Date(festivalConfig.startDate).getTime();
        const end = new Date(festivalConfig.endDate).getTime();
        return now >= start && now < end;
    }, [festivalConfig]);

    const livePartyMovie = useMemo(() => {
        const now = new Date();
        const movieArray = Object.values(movies) as Movie[];
        
        // 1. Check for explicitly LIVE parties first (highest priority)
        const liveKey = Object.keys(activeParties).find(key => {
            const m = movies[key];
            // If it's a known movie, ensure it's not unlisted. 
            // If it's not a known movie (e.g. a block), we allow it if it's live in Firestore.
            return m ? !m.isUnlisted : true;
        });

        if (liveKey) {
            if (movies[liveKey]) return movies[liveKey];
            
            // Fallback: Check if it's a festival block
            const block = festivalData.flatMap(d => d.blocks).find(b => b.id === liveKey);
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

        // 2. Fallback to upcoming scheduled parties
        const upcomingParties = movieArray
            .filter(m => m.isWatchPartyEnabled && m.watchPartyStartTime && !m.isUnlisted)
            .filter(m => {
                const start = new Date(m.watchPartyStartTime!);
                const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
                const fourHoursAgo = 4 * 60 * 60 * 1000;
                return start.getTime() > (now.getTime() - fourHoursAgo) && 
                       start.getTime() < (now.getTime() + sevenDaysInMs);
            })
            .sort((a, b) => new Date(a.watchPartyStartTime!).getTime() - new Date(b.watchPartyStartTime!).getTime());

        return upcomingParties[0] || null;
    }, [activeParties, movies, festivalData]);

    const fetchData = async (forceNoCache = false) => {
        try {
            const res = await fetch(`/api/get-live-data?t=${Date.now()}&noCache=${forceNoCache}`);
            if (res.ok) {
                const data = await res.json();
                if (data.movies) setMovies(data.movies);
                if (data.categories) setCategories(data.categories);
                if (data.zineStories) setZineStories(data.zineStories);
                if (data.aboutData) setAboutData(data.aboutData);
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
                    const states: Record<string, WatchPartyState> = {};
                    snapshot.forEach(doc => {
                        const data = doc.data() as WatchPartyState;
                        if (data.status === 'live') {
                            states[doc.id] = data;
                        }
                    });
                    setActiveParties(states);
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
        livePartyMovie,
        refreshData: () => fetchData(true)
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};