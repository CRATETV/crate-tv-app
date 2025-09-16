import { moviesData, categoriesData, festivalData, festivalConfigData } from '../constants.ts';
import { Movie, Category, FestivalDay, FestivalConfig } from '../types.ts';

export interface LiveData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
}

export interface FetchResult {
    data: LiveData;
    source: 'live' | 'fallback';
}

// In-memory cache variables
let liveDataUrl: string | null = null;
let cachedLiveData: FetchResult | null = null;
let lastFetchTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

export const invalidateCache = () => {
    // Invalidate both the data and the URL to force a full refresh
    liveDataUrl = null; 
    cachedLiveData = null;
    lastFetchTimestamp = 0;
    console.log("Live data cache invalidated.");
};

const getFallbackData = (): LiveData => ({
    movies: moviesData,
    categories: categoriesData,
    festivalData: festivalData,
    festivalConfig: festivalConfigData
});

const getLiveUrl = async (): Promise<string | null> => {
    if (liveDataUrl) return liveDataUrl;
    try {
        const response = await fetch('/api/data-config');
        if (!response.ok) return null;
        const config = await response.json();
        liveDataUrl = config.liveDataUrl;
        return liveDataUrl;
    } catch {
        return null;
    }
};

export const fetchAndCacheLiveData = async (): Promise<FetchResult> => {
    const now = Date.now();
    // Return cached data if it's available and not expired
    if (cachedLiveData && (now - lastFetchTimestamp < CACHE_DURATION_MS)) {
        return cachedLiveData;
    }

    const url = await getLiveUrl();
    if (!url) {
        console.warn("Could not retrieve live data URL, using static data.");
        return { data: getFallbackData(), source: 'fallback' };
    }

    try {
        // Use a cache-busting param to ensure the latest version is retrieved from S3
        const response = await fetch(`${url}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (!data.movies || !data.categories) {
           throw new Error('Fetched data has incorrect structure');
        }
        
        const result: FetchResult = { data, source: 'live' };
        // Store the freshly fetched data in our cache
        cachedLiveData = result;
        lastFetchTimestamp = now;
        return result;
    } catch (error) {
        console.error("Could not fetch live data, falling back to static data.", error);
        // Do not cache fallback data, so the app can retry on the next load
        return { data: getFallbackData(), source: 'fallback' };
    }
};