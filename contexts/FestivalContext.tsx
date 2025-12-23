
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
            await initializeFirebaseAuth(); // Ensure firebase is ready
            const db = getDbInstance();

            if (!db) {
                console.warn("Firestore not available, using fallback data.");
                setDataSource('fallback');
                setIsLoading(false);
                return;
            }
            
            setDataSource('live');
            
            try {
                // Set up listeners for live data.
                const moviesUnsub = db.collection('movies').onSnapshot(snapshot => {
                    const uniqueMoviesByTitle: Map<string, Movie> = new Map();
                    snapshot.forEach(doc => {
                        const movie = { key: doc.id, ...doc.data() } as Movie;
                        if (!movie.title) return; // Skip movies without a title

                        const normalizedTitle = movie.title.trim().toLowerCase();
                        const existingMovie = uniqueMoviesByTitle.get(normalizedTitle);

                        // If a movie with this title doesn't exist, add it.
                        if (!existingMovie) {
                            uniqueMoviesByTitle.set(normalizedTitle, movie);
                        } else {
                            // If the new movie has a fullMovie URL and the existing one doesn't, replace it.
                            // This prioritizes the more complete entry.
                            if (movie.fullMovie && !existingMovie.fullMovie) {
                                uniqueMoviesByTitle.set(normalizedTitle, movie);
                            }
                        }
                    });

                    // Convert the map of unique movies back to the Record<string, Movie> format
                    const liveMovies: Record<string, Movie> = {};
                    for (const movie of uniqueMoviesByTitle.values()) {
                        liveMovies[movie.key] = movie;
                    }
                    setMovies(liveMovies);
                });
                unsubscribes.push(moviesUnsub);

                const categoriesUnsub = db.collection('categories').onSnapshot(snapshot => {
                    const liveCategories: Record<string, Category> = {};
                    snapshot.forEach(doc => {
                        liveCategories[doc.id] = doc.data() as Category;
                    });
                    
                    // ROBUST FALLBACK: If the live 'nowStreaming' category is missing,
                    // has no movieKeys property, or has an empty movieKeys array,
                    // merge the fallback data to ensure the banner is always visible.
                    const liveNowStreaming = liveCategories.nowStreaming;
                    if (
                        (!liveNowStreaming || !liveNowStreaming.movieKeys || liveNowStreaming.movieKeys.length === 0) &&
                        categoriesData.nowStreaming
                    ) {
                        liveNowStreaming ? liveNowStreaming.movieKeys = categoriesData.nowStreaming.movieKeys : liveCategories.nowStreaming = categoriesData.nowStreaming;
                    }

                    setCategories(liveCategories);
                });
                unsubscribes.push(categoriesUnsub);

                const aboutUnsub = db.collection('content').doc('about').onSnapshot(doc => {
                    if (doc.exists) setAboutData(doc.data() as AboutData);
                });
                unsubscribes.push(aboutUnsub);
                
                const adsUnsub = db.collection('content').doc('ads').onSnapshot(doc => {
                    if (doc.exists) setAdConfig(doc.data() as AdConfig);
                });
                unsubscribes.push(adsUnsub);

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
                console.error("Error setting up Firestore listeners:", error);
                setDataSource('fallback'); // Revert to fallback if listeners fail
            } finally {
                setIsLoading(false);
            }
        };

        fetchDataWithFallback();

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
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
        settings
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};
