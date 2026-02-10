import React, { useMemo } from 'react';
import Header from './Header';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';
import CollapsibleFooter from './CollapsibleFooter';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import SEO from './SEO';

const PublicSquarePage: React.FC = () => {
    const { isLoading: isFestivalLoading, movies, categories } = useFestival();
    const { watchlist: watchlistArray, toggleWatchlist, likedMovies: likedMoviesArray, toggleLikeMovie, watchedMovies: watchedMoviesArray } = useAuth();

    const publicAccessMovies = useMemo(() => {
        const category = categories.publicAccess;
        if (!category) return [];
        return (category.movieKeys || [])
            .map(key => movies[key])
            .filter((m): m is Movie => !!m && !m.isUnlisted);
    }, [movies, categories]);

    const vintageVisionsMovies = useMemo(() => {
        const category = categories.publicDomainIndie;
        if (!category) return [];
        return (category.movieKeys || [])
            .map(key => movies[key])
            .filter((m): m is Movie => !!m && !m.isUnlisted);
    }, [movies, categories]);
    
    const likedMovies = useMemo(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchlist = useMemo(() => new Set(watchlistArray), [watchlistArray]);
    const watchedMovies = useMemo(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isFestivalLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-emerald-600">
            <SEO 
                title="Public Square" 
                description="The community stage for independent cinema. Free access to grassroots shows, student works, and the Vintage Visions archive." 
            />
            
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={handleMobileSearch}
                showSearch={true}
                showNavLinks={true}
            />

            <main className="flex-grow pb-24 md:pb-0 relative overflow-hidden">
                {/* Civic Background Flourish */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-600/5 blur-[120px] pointer-events-none rounded-full"></div>

                {/* Hero Section */}
                <div className="relative py-20 md:py-40 border-b border-white/5">
                    <div className="max-w-7xl mx-auto text-center px-4 animate-[fadeIn_0.8s_ease-out]">
                        <div className="inline-flex items-center gap-3 bg-emerald-600/10 border border-emerald-500/20 px-4 py-1.5 rounded-full mb-8 shadow-2xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[10px]">Community Stage // The Commons</p>
                        </div>
                        <h1 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] italic mb-8">
                            The <span className="text-emerald-500">Square.</span>
                        </h1>
                        <p className="text-xl md:text-3xl text-gray-400 max-w-3xl mx-auto font-medium leading-tight tracking-tight">
                           A dedicated stage for student thesis films, community dispatches, and the timeless masterpieces of the public domain.
                        </p>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-4 md:px-12 py-12 space-y-32">
                    {/* Modern Public Access Section */}
                    {publicAccessMovies.length > 0 && (
                        <section className="space-y-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-widest text-emerald-500 italic">Community Records</h2>
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Status: Open Stream // Modern Dispatches</p>
                                </div>
                                <div className="h-px flex-grow bg-white/5 mx-10 hidden md:block"></div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                                {publicAccessMovies.map(movie => (
                                    <div key={movie.key} className="hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] rounded-lg transition-all duration-500 transform hover:scale-105">
                                        <MovieCard 
                                            movie={movie} 
                                            onSelectMovie={handleSelectMovie} 
                                            isOnWatchlist={watchlist.has(movie.key)}
                                            onToggleWatchlist={toggleWatchlist}
                                            isLiked={likedMovies.has(movie.key)}
                                            onToggleLike={toggleLikeMovie}
                                            isWatched={watchedMovies.has(movie.key)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Vintage Visions Section */}
                    {vintageVisionsMovies.length > 0 && (
                        <section className="space-y-8 pt-12 border-t border-white/5">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-widest text-amber-500 italic">Vintage Visions</h2>
                                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Status: Historical Archive // Global Heritage</p>
                                </div>
                                <div className="h-px flex-grow bg-white/5 mx-10 hidden md:block"></div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                                {vintageVisionsMovies.map(movie => (
                                    <div key={movie.key} className="hover:shadow-[0_0_50px_rgba(245,158,11,0.15)] rounded-lg transition-all duration-500 transform hover:scale-105">
                                        <MovieCard 
                                            movie={movie} 
                                            onSelectMovie={handleSelectMovie} 
                                            isOnWatchlist={watchlist.has(movie.key)}
                                            onToggleWatchlist={toggleWatchlist}
                                            isLiked={likedMovies.has(movie.key)}
                                            onToggleLike={toggleLikeMovie}
                                            isWatched={watchedMovies.has(movie.key)}
                                            theme="gold"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {publicAccessMovies.length === 0 && vintageVisionsMovies.length === 0 && (
                        <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[4rem] opacity-30">
                            <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Establishing Local Uplink Feed...</p>
                        </div>
                    )}
                </div>
            </main>
            
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default PublicSquarePage;