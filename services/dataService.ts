import { moviesData, categoriesData, festivalData, festivalConfigData } from '../constants.ts';
import { Movie, Category, FestivalDay, FestivalConfig } from '../types.ts';

export interface LiveData {
    movies: Record<string, Movie>;
    categories: Record<string, Category>;
    festivalData: FestivalDay[];
    festivalConfig: FestivalConfig;
}

// Store data in memory to avoid refetching on every page navigation
let cachedData: LiveData | null = null;
let liveDataUrl: string | null = null;

export const invalidateCache = () => {
    cachedData = null;
    liveDataUrl = null; 
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

export const fetchAndCacheLiveData = async (): Promise<LiveData> => {
    if (cachedData) return cachedData;

    const url = await getLiveUrl();
    if (!url) {
        console.warn("Could not retrieve live data URL, using static data.");
        cachedData = getFallbackData();
        return cachedData;
    }

    try {
        // Use cache-busting param to ensure we get the latest version
        const response = await fetch(`${url}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        // Basic validation of fetched data structure
        if (!data.movies || !data.categories) {
           throw new Error('Fetched data has incorrect structure');
        }

        cachedData = data;
        return data;
    } catch (error) {
        console.error("Could not fetch live data, falling back to static data.", error);
        cachedData = getFallbackData();
        return cachedData;
    }
};