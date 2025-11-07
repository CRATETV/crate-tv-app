import { LiveData, FetchResult } from '../types';
import { moviesData, categoriesData, festivalData, festivalConfigData, aboutData } from '../constants';

const CACHE_KEY = 'cratetv-live-data';
const CACHE_TIMESTAMP_KEY = 'cratetv-live-data-timestamp';
const CACHE_DURATION = 60 * 1000; // 1 minute

// Updated to include a timestamp.
const getFallbackData = (): FetchResult => ({
  data: {
    movies: moviesData,
    categories: categoriesData,
    festivalData: festivalData,
    festivalConfig: festivalConfigData,
    aboutData: aboutData,
    actorSubmissions: [],
    // FIX: Added missing moviePipeline property to match LiveData type.
    moviePipeline: [],
  },
  source: 'fallback',
  timestamp: Date.now(),
});

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

        // Fetch main data and live likes in parallel for speed
        const [dataResponse, likesResponse] = await Promise.all([
            fetch(`${liveDataUrl}?t=${now}`), // Use timestamp to bust browser cache
            fetch('/api/get-movie-likes')
        ]);
        
        if (!dataResponse.ok) throw new Error(`Failed to fetch live data from ${liveDataUrl}`);
        const data: LiveData = await dataResponse.json();
        
        // Merge live likes into the movie data
        if (likesResponse.ok) {
            const liveLikes: Record<string, number> = await likesResponse.json();
            for (const key in liveLikes) {
                if (data.movies[key]) {
                    data.movies[key].likes = liveLikes[key];
                }
            }
            console.log("[Likes] Successfully merged live like counts.");
        } else {
            console.warn("[Likes] Could not fetch live like counts. Top 10 list may be stale.");
        }

        const result: FetchResult = { data, source: 'live', timestamp: now };
        
        try {
            // Store only the payload, not the full FetchResult with timestamp
            const cachePayload = { data, source: 'live' };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
        } catch(e) {
            console.warn("Could not write to localStorage cache.", e);
        }

        return result;

    } catch (error) {
        console.error("Failed to fetch live data, using fallback.", error);
        return getFallbackData();
    }
};
