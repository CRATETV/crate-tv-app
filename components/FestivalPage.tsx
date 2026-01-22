import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import StagingBanner from './StagingBanner';
import FestivalView from './FestivalView';
import { useFestival } from '../contexts/FestivalContext';
import BottomNavBar from './BottomNavBar';
import SearchOverlay from './SearchOverlay';
import { Movie } from '../types';
import LiveWatchPartyBanner from './LiveWatchPartyBanner';

const FestivalPage: React.FC = () => {
    const { 
        isLoading, 
        movies, 
        festivalData, 
        festivalConfig, 
        isFestivalLive, 
        dataSource,
        livePartyMovie
    } = useFestival();
    
    const [isStaging, setIsStaging] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isBannerDismissed, setIsBannerDismissed] = useState(false);
    
    useEffect(() => {
        const isStagingActive = sessionStorage.getItem('crateTvStaging') === 'true';
        if (isStagingActive) {
            setIsStaging(true);
        }
    }, []);

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        return (Object.values(movies) as Movie[]).filter(movie =>
            movie && (
                (movie.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (movie.director || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (movie.cast || []).some(actor => (actor.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
            )
        );
    }, [searchQuery, movies]);

    const handleSelectFromSearch = (movie: Movie) => {
        setIsMobileSearchOpen(false);
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const exitStaging = () => {
        sessionStorage.removeItem('crateTvStaging');
        setIsStaging(false);
        window.location.reload();
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!festivalConfig || (!isFestivalLive && !isStaging)) {
        return (
             <div className="flex flex-col min-h-screen text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-4 uppercase tracking-tighter italic">Sector Inactive</h1>
                        <p className="text-gray-400 font-medium">Please check back later for updates on our next festival session.</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const showPartyBanner = !!livePartyMovie && !isBannerDismissed;
    const headerTop = showPartyBanner ? '3rem' : '0px';
    const mainPaddingTop = showPartyBanner ? '3rem' : '0px';
    
    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            {isStaging && <StagingBanner onExit={exitStaging} isOffline={dataSource === 'fallback'} />}
            
            {showPartyBanner && (
                <LiveWatchPartyBanner 
                    movie={livePartyMovie!} 
                    onClose={() => setIsBannerDismissed(true)} 
                />
            )}

            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true} 
                onMobileSearchClick={() => setIsMobileSearchOpen(true)} 
                showSearch={false} 
                topOffset={headerTop}
            />
            
            <main className="flex-grow transition-all duration-500 pb-24 md:pb-0" style={{ paddingTop: mainPaddingTop }}>
                 <div className="max-w-7xl mx-auto p-4 sm:p-8 md:p-12">
                     <FestivalView 
                        festivalData={festivalData}
                        festivalConfig={festivalConfig}
                        allMovies={movies}
                        showHero={true}
                     />
                 </div>
            </main>

            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => setIsMobileSearchOpen(true)} />
            {isMobileSearchOpen && (
                <SearchOverlay
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    onClose={() => setIsMobileSearchOpen(false)}
                    results={searchResults}
                    onSelectMovie={handleSelectFromSearch}
                />
            )}
        </div>
    );
};

export default FestivalPage;