import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { initializeFirebaseAuth, getDbInstance } from '../services/firebaseClient';
import { Movie, Category, FestivalConfig, FestivalDay, AboutData } from '../types';
import { moviesData, categoriesData, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfig, aboutData as initialAboutData } from '../constants';
import type { Firestore, Unsubscribe } from 'firebase/firestore';

interface FestivalContextType {
    isLoading: boolean;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig | null;
    festivalData: FestivalDay[];
    aboutData: AboutData | null;
    isFestivalLive: boolean;
    dataSource: 'live' | 'fallback' | null;
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
    const [dataSource, setDataSource] = useState<'fallback' | 'live' | null>('fallback');
    const [isFestivalLive, setIsFestivalLive] = useState(false);

    useEffect(() => {
        const setupRealtimeListeners = async () => {
            await initializeFirebaseAuth();
            const db = getDbInstance();

            if (!db) {
                console.warn("Could not connect to Firestore. Using fallback data.");
                setIsLoading(false);
                return () => {}; // Return an empty unsubscribe function
            }

            console.log("Setting up real-time Firebase listeners...");
            setDataSource('live');
            const unsubscribers: Unsubscribe[] = [];
            let loadedCount = 0;
            const totalListeners = 5;

            const checkAllLoaded = () => {
                loadedCount++;
                if (loadedCount >= totalListeners) {
                    setIsLoading(false);
                    console.log("All real-time listeners initialized.");
                }
            };

            // Movies listener
            const moviesUnsub = db.collection('movies').onSnapshot(snapshot => {
                const moviesData: Record<string, Movie> = {};
                snapshot.forEach(doc => { moviesData[doc.id] = doc.data() as Movie; });
                setMovies(moviesData);
                checkAllLoaded();
            }, (error) => { console.error("Movies listener error:", error); checkAllLoaded(); });
            unsubscribers.push(moviesUnsub);

            // Categories listener
            const categoriesUnsub = db.collection('categories').onSnapshot(snapshot => {
                const categoriesData: Record<string, Category> = {};
                snapshot.forEach(doc => { categoriesData[doc.id] = doc.data() as Category; });
                setCategories(categoriesData);
                checkAllLoaded();
            }, (error) => { console.error("Categories listener error:", error); checkAllLoaded(); });
            unsubscribers.push(categoriesUnsub);

            // Festival Config listener
            const festivalConfigUnsub = db.collection('festival').doc('config').onSnapshot(doc => {
                setFestivalConfig(doc.exists ? doc.data() as FestivalConfig : initialFestivalConfig);
                checkAllLoaded();
            }, (error) => { console.error("Festival Config listener error:", error); checkAllLoaded(); });
            unsubscribers.push(festivalConfigUnsub);

            // Festival Days listener
            const festivalDaysUnsub = db.collection('festival/schedule/days').orderBy('day').onSnapshot(snapshot => {
                const daysData: FestivalDay[] = [];
                snapshot.forEach(doc => daysData.push(doc.data() as FestivalDay));
                setFestivalData(daysData);
                checkAllLoaded();
            }, (error) => { console.error("Festival Days listener error:", error); checkAllLoaded(); });
            unsubscribers.push(festivalDaysUnsub);

            // About Data listener
            const aboutDataUnsub = db.collection('content').doc('about').onSnapshot(doc => {
                setAboutData(doc.exists ? doc.data() as AboutData : initialAboutData);
                checkAllLoaded();
            }, (error) => { console.error("About Data listener error:", error); checkAllLoaded(); });
            unsubscribers.push(aboutDataUnsub);

            // Return a function that unsubscribes from all listeners
            return () => {
                console.log("Tearing down real-time listeners.");
                unsubscribers.forEach(unsub => unsub());
            };
        };

        const unsubscribePromise = setupRealtimeListeners();

        return () => {
            unsubscribePromise.then(unsub => unsub && unsub());
        };
    }, []);

    useEffect(() => {
        const checkStatus = () => {
            if (!festivalConfig?.startDate || !festivalConfig?.endDate) {
                setIsFestivalLive(false);
                return;
            }
            const now = new Date();
            const start = new Date(festivalConfig.startDate);
            const end = new Date(festivalConfig.endDate);
            const isLive = now >= start && now < end;
            
            setIsFestivalLive(prevIsLive => prevIsLive !== isLive ? isLive : prevIsLive);
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, [festivalConfig]);

    const value = {
        isLoading,
        movies,
        categories,
        festivalConfig,
        festivalData,
        aboutData,
        isFestivalLive,
        dataSource,
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};
