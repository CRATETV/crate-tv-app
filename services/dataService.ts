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
        const cachedTimestampStr = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
        const cachedJsonStr = sessionStorage.getItem(CACHE_KEY);

        // FIX: Explicitly check for non-null strings to satisfy TypeScript's strict null checks.
        if (typeof cachedJsonStr === 'string' && typeof cachedTimestampStr === 'string') {
            const age = Date.now() - parseInt(cachedTimestampStr, 10);
            if (age < CACHE_DURATION) {
                console.log('Using fresh data from session storage cache.');
                const parsedData: FetchResult = JSON.parse(cachedJsonStr);
                cachedData = parsedData; // Update the in-memory cache as well
                return parsedData;
            } else {
                console.log('Session storage cache is stale.');
                invalidateCache();
            }
        }
    } catch (e) {
        console.warn("Could not read from session storage cache.", e);
        invalidateCache(); // Also invalidate if JSON parsing fails
    }

    // If session cache is stale or invalid, check in-memory cache.
    // FIX: Assigning to a local constant helps TypeScript's control flow analysis.
    const inMemoryCache = cachedData;
    if (inMemoryCache) {
        console.log('Using in-memory cached data.');
        return inMemoryCache;
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
        
        // --- FIX: Merge classic films into live data ---
        // This ensures the public domain classics from constants.ts are always present,
        // protecting them from being accidentally removed by a publish from the admin panel.
        const classicCategory = categoriesData.publicDomainIndie;
        if (classicCategory && classicCategory.movieKeys) {
            // Ensure the category exists in the live data
            if (!data.categories.publicDomainIndie) {
                data.categories.publicDomainIndie = classicCategory;
            }
            // Ensure all classic movie data objects exist in the live data
            classicCategory.movieKeys.forEach(key => {
                if (moviesData[key]) {
                    data.movies[key] = moviesData[key];
                }
            });
        }
        // --- END FIX ---
        
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