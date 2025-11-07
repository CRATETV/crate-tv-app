import React, { useMemo } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import MovieCarousel from './MovieCarousel';

const TopTenPage: React.FC = () => {
    const { isLoading, movies } = useFestival();
    const { likedMovies, toggleLikeMovie, watchlist, watchedMovies } = useAuth();
    
    const topTenMovies = useMemo(() => {
        return Object.values(movies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);
    
    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    const heroMovie = topTenMovies[0];

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
                showNavLinks={false}
            />
            <main className="flex-grow pt-16 pb-24 md:pb-0">
                {heroMovie && (
                     <div className="relative w-full h-[50vh] md:h-[60vh] bg-black mb-12">
                         <img
                            src={`/api/proxy-image?url=${encodeURIComponent(heroMovie.poster)}`}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                            onContextMenu={(e) => e.preventDefault()}
                            crossOrigin="anonymous"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                         <div className="relative z-10 flex flex-col justify-end h-full p-4 md:p-12 text-center items-center">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-2" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.7)' }}>
                                Top 10 on Crate TV
                            </h1>
                            <p className="text-lg text-gray-300">The most-loved films by the community, right now.</p>
                         </div>
                     </div>
                )}
               
                <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-20">
                    <MovieCarousel
                        title=""
                        movies={topTenMovies}
                        onSelectMovie={handleSelectMovie}
                        showRankings={true}
                        watchedMovies={new Set(watchedMovies)}
                        watchlist={new Set(watchlist)}
                        likedMovies={new Set(likedMovies)}
                        onToggleLike={toggleLikeMovie}
                        onSupportMovie={() => { /* Not applicable here */ }}
                    />
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />
        </div>
    );
};

export default TopTenPage;
