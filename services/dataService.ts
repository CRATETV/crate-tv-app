
import { LiveData, FetchResult } from '../types.ts';
import { moviesData, categoriesData, festivalData, festivalConfigData, aboutData } from '../constants.ts';

const CACHE_KEY = 'cratetv-live-data';
const CACHE_TIMESTAMP_KEY = 'cratetv-live-data-timestamp';
const LAST_KNOWN_FESTIVAL_DATES_KEY = 'cratetv-last-known-festival-dates';
const CACHE_DURATION = 60 * 1000; // 1 minute

// Updated to include a timestamp and sticky festival status.
const getFallbackData = (): FetchResult => {
  const fallbackResult: FetchResult = {
    data: {
      movies: moviesData,
      categories: categoriesData,
      festivalData: festivalData,
      festivalConfig: { ...festivalConfigData }, // Create a copy to make it mutable
      aboutData: aboutData,
    },
    source: 'fallback',
    timestamp: Date.now(),
  };

  // "STICKY" LOGIC: If the app fails to fetch live data, use the last known
  // festival dates to prevent the festival from disappearing on a network blip.
  try {
    const lastKnownDates = localStorage.getItem(LAST_KNOWN_FESTIVAL_DATES_KEY);
    if (lastKnownDates && fallbackResult.data.festivalConfig) {
      const { startDate, endDate } = JSON.parse(lastKnownDates);
      fallbackResult.data.festivalConfig.startDate = startDate;
      fallbackResult.data.festivalConfig.endDate = endDate;
      console.log("[Fallback] Applied sticky festival dates to fallback data.");
    }
  } catch (e) {
    console.warn("Could not apply sticky festival dates to fallback data.", e);
  }

  return fallbackResult;
};

export const invalidateCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (e) {
      console.warn("Could not invalidate localStorage cache.", e);
    }
};

export const fetchAndCacheLiveData = async (options?: { force?: boolean }): Promise<FetchResult> => {
    const now = Date.now();
    
    // --- CACHE READ LOGIC ---
    if (!options?.force) {
        try {
            const cachedTimestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            const cachedJsonStr = localStorage.getItem(CACHE_KEY);

            if (cachedJsonStr && cachedTimestampStr) {
                const cacheTime = parseInt(cachedTimestampStr, 10);
                const isCacheFresh = (now - cacheTime) < CACHE_DURATION;

                if (isCacheFresh) {
                    console.log(`[Cache] Using fresh localStorage data from ${new Date(cacheTime).toLocaleTimeString()}.`);
                    const cachePayload = JSON.parse(cachedJsonStr); // This is { data, source }
                    return { ...cachePayload, timestamp: cacheTime };
                }
            }
        } catch (e) {
            console.warn("Could not read/parse localStorage cache. Invalidating and fetching fresh data.", e);
            invalidateCache();
        }
    }
    
    // --- NETWORK FETCH LOGIC ---
    console.log(`[Network] Fetching fresh data. Forced: ${!!options?.force}`);

    try {
        const configResponse = await fetch('/api/data-config', { method: 'POST' });
        if (!configResponse.ok) throw new Error('Could not fetch data configuration.');
        const { liveDataUrl } = await configResponse.json();

        if (!liveDataUrl) {
            console.warn("Live data URL not provided by server. Using fallback data.");
            return getFallbackData();
        }

        const dataResponse = await fetch(`${liveDataUrl}?t=${now}`); // Use timestamp to bust browser cache
        if (!dataResponse.ok) throw new Error(`Failed to fetch live data from ${liveDataUrl}`);
        const data: LiveData = await dataResponse.json();
        
        // Merge classic films into live data
        const classicCategory = categoriesData.publicDomainIndie;
        if (classicCategory && classicCategory.movieKeys) {
            if (!data.categories.publicDomainIndie) {
                data.categories.publicDomainIndie = classicCategory;
            }
            classicCategory.movieKeys.forEach(key => {
                if (moviesData[key]) {
                    data.movies[key] = moviesData[key];
                }
            });
        }
        
        const result: FetchResult = { data, source: 'live', timestamp: now };
        
        try {
            // Store only the payload, not the full FetchResult with timestamp
            const cachePayload = { data, source: 'live' };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());

            // Store the last known festival dates to make the UI "sticky"
            if (data.festivalConfig) {
                const datesToStore = {
                    startDate: data.festivalConfig.startDate,
                    endDate: data.festivalConfig.endDate,
                };
                localStorage.setItem(LAST_KNOWN_FESTIVAL_DATES_KEY, JSON.stringify(datesToStore));
            }
        } catch(e) {
            console.warn("Could not write to localStorage cache.", e);
        }

        return result;

    } catch (error) {
        console.error("Failed to fetch live data, using fallback.", error);
        return getFallbackData();
    }
};
