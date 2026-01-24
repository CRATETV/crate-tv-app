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
// CRITICAL FIX: Reduced cache duration from 5 minutes to 30 seconds for smoother updates.
const CACHE_DURATION = 30 * 1000; 

export const fetchAndCacheLiveData = async (options: { force?: boolean } = {}): Promise<FetchResult> => {
    const now = Date.now();
    // Allow bypassing cache if 'force' is true
    if (!options.force && cachedData && (now - lastFetchTimestamp < CACHE_DURATION)) {
        return { data: cachedData, source: 'live' };
    }

    try {
        // Append a timestamp and noCache flag to ensure we hit the fresh S3/DB state
        const url = `/api/get-live-data?t=${now}${options.force ? '&noCache=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch live data from API.');
        }
        const data: LiveData = await response.json();
        
        cachedData = data;
        lastFetchTimestamp = now;
        
        return { data, source: 'live' };
    } catch (error) {
        console.error("Live data fetch failed, using fallback:", error);
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