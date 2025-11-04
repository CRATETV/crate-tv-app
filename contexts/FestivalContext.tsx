import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Category, FestivalConfig, LiveData, FetchResult, FestivalDay } from '../types';

interface BroadcastMessage {
  type: string;
  payload: LiveData;
}

interface FestivalContextType {
    isLoading: boolean;
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalConfig: FestivalConfig | null;
    festivalData: FestivalDay[];
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
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
    const [isFestivalLive, setIsFestivalLive] = useState(false);

    const applyData = useCallback((result: FetchResult) => {
        setDataSource(result.source);
        setMovies(result.data.movies);
        setCategories(result.data.categories);
        setFestivalConfig(result.data.festivalConfig);
        setFestivalData(result.data.festivalData);
    }, []);

    const loadAppData = useCallback(async (options?: { force?: boolean }) => {
        try {
            const result = await fetchAndCacheLiveData({ force: options?.force });
            applyData(result);
        } catch (error) {
            console.error("Failed to load app data", error);
        }
    }, [applyData]);

    useEffect(() => {
        setIsLoading(true);
        const isStagingActive = sessionStorage.getItem('crateTvStaging') === 'true';
        loadAppData({ force: isStagingActive }).finally(() => setIsLoading(false));

        // Real-time data synchronization
        const channel = new BroadcastChannel('cratetv-data-channel');
        const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
            if (event.data?.type === 'DATA_PUBLISHED' && event.data.payload) {
                const liveData = event.data.payload;
                const now = Date.now();
                console.log(`[Broadcast] Received new data in FestivalContext. Applying immediately.`);
                applyData({ data: liveData, source: 'live', timestamp: now });

                try {
                    const cachePayload = { data: liveData, source: 'live' };
                    localStorage.setItem('cratetv-live-data', JSON.stringify(cachePayload));
                    localStorage.setItem('cratetv-live-data-timestamp', now.toString());
                } catch(e) {
                    console.warn("[Broadcast] Could not write new data to localStorage cache.", e);
                }
            }
        };
        channel.addEventListener('message', handleMessage);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Visibility] Tab is now visible. Checking for fresh data in FestivalContext.');
                loadAppData({ force: true });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            channel.removeEventListener('message', handleMessage);
            channel.close();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadAppData, applyData]);

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
        isFestivalLive,
        dataSource,
    };

    return (
        <FestivalContext.Provider value={value}>
            {children}
        </FestivalContext.Provider>
    );
};
