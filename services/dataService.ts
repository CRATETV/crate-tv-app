import { moviesData, categoriesData, festivalData, festivalConfigData } from '../constants.ts';
import { Movie, Category, FestivalDay, FestivalConfig } from '../types.ts';

export interface LiveData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
}

// Store the live data URL in memory to avoid refetching it constantly
let liveDataUrl: string | null = null;

export const invalidateCache = () => {
    // Invalidate the cached URL, so it's refetched next time.
    liveDataUrl = null; 
    console.log("Live data URL cache invalidated.");
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

export const fetchAndCacheLiveData = async (): Promise<LiveData> => {
    const url = await getLiveUrl();
    if (!url) {
        console.warn("Could not retrieve live data URL, using static data.");
        // Return fallback data if the live URL can't be fetched.
        return getFallbackData();
    }

    try {
        // Fetch fresh data every time. Use a cache-busting param to ensure the latest version is retrieved.
        const response = await fetch(`${url}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        // Basic validation of fetched data structure
        if (!data.movies || !data.categories) {
           throw new Error('Fetched data has incorrect structure');
        }
        
        // Return the fresh data without caching it in this service.
        return data;
    } catch (error) {
        console.error("Could not fetch live data, falling back to static data.", error);
        return getFallbackData();
    }
};
