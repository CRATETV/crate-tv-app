import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { initializeFirebaseAuth, getDbInstance } from '../services/firebaseClient';
import { Movie, Category, FestivalConfig, FestivalDay, AboutData, AdConfig, SiteSettings, MoviePipelineEntry } from '../types';
import { moviesData, categoriesData, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig, aboutData as initialAboutData } from '../constants';

interface FestivalContextType {
    isLoading: boolean;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig | null;
    festivalData: FestivalDay[];
    aboutData: AboutData | null;
    isFestivalLive: boolean;
    dataSource: 'live' | 'fallback' | null;
    adConfig: AdConfig | null;
    settings: SiteSettings;
    pipeline: MoviePipelineEntry[];
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
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(initialFestivalConfig);
    const [festivalData, setFestivalData] = useState<FestivalDay[]>(initialFestivalData);
    const [aboutData, setAboutData] = useState<AboutData | null>(initialAboutData);
    const [adConfig, setAdConfig] = useState<AdConfig | null>(null);
    const [settings, setSettings] = useState<SiteSettings>({ isHolidayModeActive: false });
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);

    const isFestivalLive = useMemo(() => {
        if (!festivalConfig?.startDate || !festivalConfig?.endDate) return false;
        const now = new Date().getTime();
        const start = new Date(festivalConfig.startDate).getTime();
        const end = new Date(festivalConfig.endDate).getTime();
        return now >= start && now < end;
    }, [festivalConfig]);

    const fetchData = async (forceNoCache = false) => {
        try {
            const res = await fetch(`/api/get-live-data?t=${Date.now()}&noCache=${forceNoCache}`);
            if (res.ok) {
                const data = await res.json();
                if (data.movies) setMovies(data.movies);
                if (data.categories) setCategories(data.categories);
                if (data.aboutData) setAboutData(data.aboutData);
                if (data.settings) setSettings(data.settings);
                if (data.festivalConfig) setFestivalConfig(data.festivalConfig);
                if (data.festivalData) setFestivalData(data.festivalData);
                setDataSource('live');
            }
        } catch (err) {
            console.error("Live sync failed, using local fallback.", err);
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
                // Settings & Festival listeners
                db.collection('content').doc('settings').onSnapshot(doc => {
                    if (doc.exists) setSettings(doc.data() as SiteSettings);
                });

                db.collection('festival').doc('config').onSnapshot(doc => {
                    if (doc.exists) setFestivalConfig(doc.data() as FestivalConfig);
                });

                // Pipeline listener for Crate Fest submissions
                db.collection('movie_pipeline').onSnapshot(snapshot => {
                    const entries: MoviePipelineEntry[] = [];
                    snapshot.forEach(doc => {
                        entries.push({ id: doc.id, ...doc.data() } as MoviePipelineEntry);
                    });
                    setPipeline(entries);
                });
            }
        };
        init();
    }, []);

    const value: FestivalContextType = {
        isLoading,
        movies,
        categories,
        festivalConfig,
        festivalData,
        aboutData,
        isFestivalLive,
        dataSource,
        adConfig,
        settings,
        pipeline,
        refreshData: () => fetchData(true)
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};