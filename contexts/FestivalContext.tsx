import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { initializeFirebaseAuth, getDbInstance } from '../services/firebaseClient';
import { Movie, Category, FestivalConfig, FestivalDay, AboutData, AdConfig, SiteSettings } from '../types';
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
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);

    const isFestivalLive = useMemo(() => {
        if (!festivalConfig?.startDate || !festivalConfig?.endDate) return false;
        const now = new Date();
        return now >= new Date(festivalConfig.startDate) && now < new Date(festivalConfig.endDate);
    }, [festivalConfig]);

    useEffect(() => {
        let unsubscribes: (() => void)[] = [];

        const fetchDataWithFallback = async () => {
            await initializeFirebaseAuth();
            const db = getDbInstance();

            if (!db) {
                setDataSource('fallback');
                setIsLoading(false);
                return;
            }
            
            setDataSource('live');
            
            try {
                // Primary movies listener
                const moviesUnsub = db.collection('movies').onSnapshot(snapshot => {
                    const liveMovies: Record<string, Movie> = {};
                    snapshot.forEach(doc => {
                        liveMovies[doc.id] = { key: doc.id, ...doc.data() } as Movie;
                    });
                    setMovies(liveMovies);
                });
                unsubscribes.push(moviesUnsub);

                // Categories listener with automatic unlisted content filtering
                const categoriesUnsub = db.collection('categories').onSnapshot(snapshot => {
                    const liveCategories: Record<string, Category> = {};
                    snapshot.forEach(doc => {
                        const catData = doc.data() as Category;
                        
                        // CRITICAL: Filter out movies marked as isUnlisted from the public category views.
                        // They will still be in the 'movies' map for Watch Party direct access.
                        const filteredKeys = (catData.movieKeys || []).filter(key => {
                            const movie = movies[key];
                            return !movie?.isUnlisted;
                        });
                        
                        liveCategories[doc.id] = { ...catData, movieKeys: filteredKeys };
                    });
                    setCategories(liveCategories);
                });
                unsubscribes.push(categoriesUnsub);

                const aboutUnsub = db.collection('content').doc('about').onSnapshot(doc => {
                    if (doc.exists) setAboutData(doc.data() as AboutData);
                });
                unsubscribes.push(aboutUnsub);
                
                const settingsUnsub = db.collection('content').doc('settings').onSnapshot(doc => {
                    if (doc.exists) setSettings(doc.data() as SiteSettings);
                });
                unsubscribes.push(settingsUnsub);

                const festivalConfigUnsub = db.collection('festival').doc('config').onSnapshot(doc => {
                    if (doc.exists) setFestivalConfig(doc.data() as FestivalConfig);
                });
                unsubscribes.push(festivalConfigUnsub);
                
                const festivalDaysUnsub = db.collection('festival').doc('schedule').collection('days').onSnapshot(snapshot => {
                    const days: FestivalDay[] = [];
                    snapshot.forEach(doc => days.push(doc.data() as FestivalDay));
                    setFestivalData(days.sort((a, b) => a.day - b.day));
                });
                unsubscribes.push(festivalDaysUnsub);

            } catch (error) {
                console.error("Error setting up listeners:", error);
                setDataSource('fallback');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDataWithFallback();
        return () => unsubscribes.forEach(unsub => unsub());
    }, [movies]); // Re-subscribe if movies reference map changes to ensure filter stays fresh

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
        settings
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};