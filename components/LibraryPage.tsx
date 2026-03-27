
import React, { useState, useMemo, useEffect } from 'react';
import Header from './Header';
import { Movie, Category } from '../types';
import { isMovieReleased } from '../constants';
import { MovieCard } from './MovieCard';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import SearchOverlay from './SearchOverlay';

const LibraryPage: React.FC = () => {
    const { isLoading, movies, categories } = useFestival();
    const { user, watchlist: watchlistArray, toggleWatchlist, likedMovies: likedMoviesArray, toggleLikeMovie, watchedMovies: watchedMoviesArray } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const watchlist = useMemo(() => new Set(watchlistArray), [watchlistArray]);
    const likedMovies = useMemo(() => new Set(likedMoviesArray), [likedMoviesArray]);
    const watchedMovies = useMemo(() => new Set(watchedMoviesArray), [watchedMoviesArray]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category');
        if (cat) setSelectedCategory(cat);
    }, []);

    const allMoviesList = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter(m => !!m && !m.isUnlisted && isMovieReleased(m))
            .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    }, [movies]);

    const filteredMovies = useMemo(() => {
        let list = allMoviesList;

        if (selectedCategory !== 'all') {
            const cat = categories[selectedCategory];
            if (cat) {
                list = list.filter(m => cat.movieKeys.includes(m.key));
            }
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(m => 
                m.title.toLowerCase().includes(q) || 
                m.director.toLowerCase().includes(q) ||
                m.cast.some(a => a.name.toLowerCase().includes(q))
            );
        }

        return list;
    }, [allMoviesList, selectedCategory, searchQuery, categories]);

    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col">
            <Header 
                searchQuery={searchQuery} 
                onSearch={setSearchQuery} 
                onMobileSearchClick={() => setIsSearchOpen(true)}
            />

            <main className="flex-grow pt-24 pb-32 px-4 md:px-12 max-w-7xl mx-auto w-full">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic">The Library.</h1>
                        <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px]">Exploring {filteredMovies.length} nodes in the catalog</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button 
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCategory === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'}`}
                        >
                            All
                        </button>
                        {Object.entries(categories).map(([key, cat]) => {
                            if (['featured', 'zine', 'editorial'].includes(key)) return null;
                            return (
                                <button 
                                    key={key}
                                    onClick={() => setSelectedCategory(key)}
                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCategory === key ? 'bg-red-600 text-white border-red-600' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'}`}
                                >
                                    {cat.title}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {filteredMovies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8 animate-[fadeIn_0.5s_ease-out]">
                        {filteredMovies.map(movie => (
                            <MovieCard 
                                key={movie.key}
                                movie={movie}
                                onSelectMovie={handleSelectMovie}
                                isLiked={likedMovies.has(movie.key)}
                                isOnWatchlist={watchlist.has(movie.key)}
                                isWatched={watchedMovies.has(movie.key)}
                                onToggleLike={toggleLikeMovie}
                                onToggleWatchlist={toggleWatchlist}
                                onSupportMovie={() => {}}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center space-y-6 opacity-30">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5 mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-xl font-black uppercase tracking-widest text-gray-500 italic">No nodes found in this sector</p>
                        <button onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors underline underline-offset-4">Reset Filters</button>
                    </div>
                )}
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => setIsSearchOpen(true)} />
            
            {isSearchOpen && (
                <SearchOverlay 
                    searchQuery={searchQuery} 
                    onSearch={setSearchQuery} 
                    onClose={() => setIsSearchOpen(false)} 
                    results={filteredMovies} 
                    onSelectMovie={(m) => { setIsSearchOpen(false); handleSelectMovie(m); }} 
                />
            )}
        </div>
    );
};

export default LibraryPage;
