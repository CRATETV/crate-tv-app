
import { Movie, Category, FestivalDay, FestivalConfig, AboutData, AdConfig } from '../types';

interface LiveData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
    aboutData: AboutData;
    adConfig?: AdConfig;
}

interface FetchResult {
    data: LiveData;
    source: 'live' | 'fallback';
}

// In-memory cache
let cachedData: LiveData | null = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const fetchAndCacheLiveData = async (options: { force?: boolean } = {}): Promise<FetchResult> => {
    const now = Date.now();
    if (!options.force && cachedData && (now - lastFetchTimestamp < CACHE_DURATION)) {
        return { data: cachedData, source: 'live' };
    }

    try {
        const response = await fetch('/api/get-live-data');
        if (!response.ok) {
            throw new Error('Failed to fetch live data from API.');
        }
        const data: LiveData = await response.json();
        
        cachedData = data;
        lastFetchTimestamp = now;
        
        return { data, source: 'live' };
    } catch (error) {
        console.error("Live data fetch failed, using fallback:", error);
        // As a fallback, you might want to import from constants.ts, but that can be complex.
        // The robust fallback is already handled server-side in the API.
        // For the client, if the API fails, it might be better to show an error.
        // However, to keep the app running, we'll simulate a fallback.
        const { moviesData, categoriesData, festivalData, festivalConfigData, aboutData } = await import('../constants');
        const fallbackData = {
            movies: moviesData,
            categories: categoriesData,
            festivalData: festivalData,
            festivalConfig: festivalConfigData,
            aboutData: aboutData,
            adConfig: {}
        };
        return { data: fallbackData, source: 'fallback' };
    }
};
