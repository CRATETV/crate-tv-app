import { Movie, Category, FestivalDay, FestivalConfig } from '../types';
import { moviesData, categoriesData, festivalData, festivalConfigData } from '../constants';

interface LiveData {
  movies: Record<string, Movie>;
  categories: Record<string, Category>;
  festivalData: FestivalDay[];
  festivalConfig: FestivalConfig;
}

interface FetchResult {
  data: LiveData;
  source: 'live' | 'fallback';
}

let cachedData: FetchResult | null = null;
const CACHE_KEY = 'cratetv-live-data';
const CACHE_TIMESTAMP_KEY = 'cratetv-live-data-timestamp';
// Cache data for 1 minute to reduce network requests and improve performance.
const CACHE_DURATION = 60 * 1000; // 1 minute

const getFallbackData = (): FetchResult => ({
  data: {
    movies: moviesData,
    categories: categoriesData,
    festivalData: festivalData,
    festivalConfig: festivalConfigData,
  },
  source: 'fallback',
});

export const invalidateCache = () => {
    cachedData = null;
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (e) {
      console.warn("Could not invalidate session storage cache.", e);
    }
};

export const fetchAndCacheLiveData = async (): Promise<FetchResult> => {
    // Check session storage first for quick loads across page navigations
    try {
        const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const cachedJson = sessionStorage.getItem(CACHE_KEY);
        if (cachedJson && cachedTimestamp) {
            const age = Date.now() - parseInt(cachedTimestamp, 10);
            if (age < CACHE_DURATION) {
                console.log('Using fresh data from session storage cache.');
                cachedData = JSON.parse(cachedJson);
                return cachedData as FetchResult;
            } else {
                console.log('Session storage cache is stale.');
                invalidateCache();
            }
        }
    } catch (e) {
        console.warn("Could not read from session storage cache.", e);
        invalidateCache();
    }

    // If session cache is stale or invalid, check in-memory cache
    if (cachedData) {
        console.log('Using in-memory cached data.');
        return cachedData;
    }

    console.log('Fetching fresh data...');

    try {
        // Fetch the config to find where the live data is
        const configResponse = await fetch('/api/data-config', { method: 'POST' });
        if (!configResponse.ok) {
            throw new Error('Could not fetch data configuration.');
        }
        const { liveDataUrl } = await configResponse.json();

        if (!liveDataUrl) {
            console.warn("Live data URL not provided by server. Using fallback data.");
            return getFallbackData();
        }

        // Fetch the actual live data from S3, adding a timestamp to bypass browser cache
        const dataResponse = await fetch(`${liveDataUrl}?t=${new Date().getTime()}`);
        if (!dataResponse.ok) {
            throw new Error(`Failed to fetch live data from ${liveDataUrl}`);
        }
        const data: LiveData = await dataResponse.json();
        
        const result: FetchResult = { data, source: 'live' };

        // Cache the new data
        cachedData = result;
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
            sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch(e) {
            console.warn("Could not write to session storage cache.", e);
        }

        return result;

    } catch (error) {
        console.error("Failed to fetch live data, using fallback.", error);
        return getFallbackData();
    }
};