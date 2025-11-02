import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import StagingBanner from './StagingBanner';
import FestivalView from './FestivalView';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, FestivalDay, FestivalConfig, LiveData, FetchResult } from '../types';

interface BroadcastMessage {
    type: string;
    payload: LiveData;
}

const FestivalPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [isStaging, setIsStaging] = useState(false);
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);
    const [isFestivalLive, setIsFestivalLive] = useState(false);

    const applyData = useCallback((result: FetchResult) => {
        setDataSource(result.source);
        setMovies(result.data.movies);
        setFestivalData(result.data.festivalData);
        setFestivalConfig(result.data.festivalConfig);
    }, []);

    const loadAppData = useCallback(async (options?: { force?: boolean }) => {
        try {
            const result = await fetchAndCacheLiveData({ force: options?.force });
            applyData(result);
        } catch (error) {
            console.error("Failed to load festival data", error);
        }
    }, [applyData]);

    // Effect for initial load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const env = params.get('env');
        const isStagingActive = env === 'staging' || sessionStorage.getItem('crateTvStaging') === 'true';
        if (isStagingActive) {
            sessionStorage.setItem('crateTvStaging', 'true');
            setIsStaging(true);
        }

        setIsLoading(true);
        loadAppData({ force: isStagingActive }).finally(() => setIsLoading(false));
    }, [loadAppData]);

    // Effect for real-time data synchronization
    useEffect(() => {
        const channel = new BroadcastChannel('cratetv-data-channel');
        const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
          if (event.data?.type === 'DATA_PUBLISHED' && event.data.payload) {
            console.log(`[Festival Page Broadcast] Received new data. Applying immediately.`);
            applyData({ data: event.data.payload, source: 'live', timestamp: Date.now() });
          }
        };
        channel.addEventListener('message', handleMessage);

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log('[Festival Page Visibility] Tab is now visible. Checking for fresh data.');
            loadAppData({ force: true });
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
          channel.removeEventListener('message', handleMessage);
          channel.close();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadAppData, applyData]);
    
    // This effect dynamically and periodically checks if the festival is live.
    useEffect(() => {
        const checkStatus = () => {
            if (!festivalConfig?.startDate || !festivalConfig?.endDate) {
                setIsFestivalLive(false);
                return;
            }
            const now = new Date();
            const start = new Date(festivalConfig.startDate);
            const end = new Date(festivalConfig.endDate);
            const isLive = now >= start && now < end;

            // Only update state if the value has changed to prevent unnecessary re-renders
            setIsFestivalLive(prevIsLive => {
                if (prevIsLive !== isLive) {
                    return isLive;
                }
                return prevIsLive;
            });
        };

        checkStatus(); // Initial check
        const interval = setInterval(checkStatus, 30000); // Check every 30 seconds for responsiveness

        return () => clearInterval(interval); // Cleanup
    }, [festivalConfig]);

    const exitStaging = () => {
        sessionStorage.removeItem('crateTvStaging');
        const params = new URLSearchParams(window.location.search);
        params.delete('env');
        window.location.search = params.toString();
    };

    // This robust check prevents rendering until all necessary data is loaded, preventing crashes.
    if (isLoading || (isStaging && !festivalConfig)) {
        return <LoadingSpinner />;
    }

    // This condition now safely runs after all data is loaded.
    if (!festivalConfig || (!isFestivalLive && !isStaging)) {
        return (
             <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-4">The Festival is Not Currently Live</h1>
                        <p className="text-gray-400">Please check back later for updates on our next event.</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            {isStaging && <StagingBanner onExit={exitStaging} isOffline={dataSource === 'fallback'} />}
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} isFestivalLive={isFestivalLive} />
            
            <main className="flex-grow pt-16">
                 <div className="max-w-7xl mx-auto p-4 sm:p-8 md:p-12">
                     <FestivalView 
                        festivalData={festivalData}
                        festivalConfig={festivalConfig}
                        allMovies={movies}
                     />
                 </div>
            </main>

            <Footer />
            <BackToTopButton />
        </div>
    );
};

export default FestivalPage;