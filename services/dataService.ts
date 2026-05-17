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
// PERF FIX: Was 5 seconds — caused a fresh API call every 5 seconds.
// Now 5 minutes. Admin changes still reflect quickly on next cache expiry.
const CACHE_DURATION = 5 * 60 * 1000;

export const fetchAndCacheLiveData = async (options: { force?: boolean } = {}): Promise<FetchResult> => {
    const now = Date.now();
    if (!options.force && cachedData && (now - lastFetchTimestamp < CACHE_DURATION)) {
        return { data: cachedData, source: 'live' };
    }

    try {
        // PERF FIX: Removed cache: 'no-store' and no-cache headers.
        // These were bypassing both browser cache and Vercel Edge cache on every call.
        // The browser will now cache the response per the API's Cache-Control headers (60s).
        const url = `/api/get-live-data${options.force ? '?noCache=true' : ''}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to fetch live data from API.');

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
