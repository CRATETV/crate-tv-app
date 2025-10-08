import React, { useState, useEffect } from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import BackToTopButton from './BackToTopButton.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';
import StagingBanner from './StagingBanner.tsx';
import FestivalView from './FestivalView.tsx';
import { fetchAndCacheLiveData } from '../services/dataService.ts';
import { Movie, FestivalDay, FestivalConfig } from '../types.ts';

const FestivalPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [isStaging, setIsStaging] = useState(false);
    const [dataSource, setDataSource] = useState<'live' | 'fallback' | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const env = params.get('env');
        const isStagingActive = env === 'staging' || sessionStorage.getItem('crateTvStaging') === 'true';
        if (isStagingActive) {
            sessionStorage.setItem('crateTvStaging', 'true');
            setIsStaging(true);
        }

        setIsLoading(true);
        
        const loadData = async () => {
            try {
                const { data: liveData, source } = await fetchAndCacheLiveData();
                setMovies(liveData.movies);
                setDataSource(source);
                setFestivalData(liveData.festivalData);
                setFestivalConfig(liveData.festivalConfig);
            } catch (error) {
                console.error("Failed to load data for Festival page:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const exitStaging = () => {
        sessionStorage.removeItem('crateTvStaging');
        const params = new URLSearchParams(window.location.search);
        params.delete('env');
        window.location.search = params.toString();
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!festivalConfig || !festivalConfig.isFestivalLive) {
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
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} isFestivalLive={festivalConfig?.isFestivalLive} />
            
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