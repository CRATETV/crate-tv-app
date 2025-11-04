import React, { useState, useEffect } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import StagingBanner from './StagingBanner';
import FestivalView from './FestivalView';
import { useFestival } from '../contexts/FestivalContext';
import BottomNavBar from './BottomNavBar';
import SearchOverlay from './SearchOverlay';


const FestivalPage: React.FC = () => {
    const { 
        isLoading, 
        movies, 
        festivalData, 
        festivalConfig, 
        isFestivalLive, 
        dataSource 
    } = useFestival();
    
    const [isStaging, setIsStaging] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    
    useEffect(() => {
        const isStagingActive = sessionStorage.getItem('crateTvStaging') === 'true';
        if (isStagingActive) {
            setIsStaging(true);
        }
    }, []);

    const exitStaging = () => {
        sessionStorage.removeItem('crateTvStaging');
        setIsStaging(false);
        // A full reload is best here to ensure non-staging data is fetched cleanly
        window.location.reload();
    };
    
    const handleSearchSubmit = (query: string) => {
        if (query) {
            const homeUrl = new URL('/', window.location.origin);
            homeUrl.searchParams.set('search', query);
            window.history.pushState({}, '', homeUrl.toString());
            window.dispatchEvent(new Event('pushstate'));
        }
        setIsMobileSearchOpen(false);
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

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
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => setIsMobileSearchOpen(true)} showSearch={false} />
            
            <main className="flex-grow pt-16 pb-24 md:pb-0">
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
            <BottomNavBar onSearchClick={() => setIsMobileSearchOpen(true)} />
            {isMobileSearchOpen && (
                <SearchOverlay
                    searchQuery=""
                    onSearch={() => {}}
                    onClose={() => setIsMobileSearchOpen(false)}
                    onSubmit={handleSearchSubmit}
                />
            )}
        </div>
    );
};

export default FestivalPage;