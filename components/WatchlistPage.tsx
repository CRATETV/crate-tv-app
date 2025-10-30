import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import MovieCard from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal';
import ActorBioModal from './ActorBioModal';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Actor, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';

const WatchlistPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});
    const [allCategories, setAllCategories] = useState<Record<string, Category>>({});
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());

    const { user, toggleWatchlist } = useAuth();

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setAllMovies(data.movies);
                setAllCategories(data.categories);
                 const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
                if (storedLikedMovies) {
                    setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
                }
            } catch (error) {
                console.error("Failed to load data for Watchlist page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);
    
    const watchlistMovies = useMemo(() => {
        if (!user?.watchlist) return [];
        return user.watchlist.map(key => allMovies[key]).filter(Boolean);
    }, [user, allMovies]);

    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    const handleCloseDetailsModal = () => setDetailsMovie(null);
    const handleSelectActor = (actor: Actor) => setSelectedActor(actor);
    const handleCloseActorModal = () => setSelectedActor(null);
    
    const toggleLikeMovie = (movieKey: string) => {
        // This is a simplified version, as the main App component owns the server-syncing logic.
        // For a fully persistent experience, this would also call a context method.
        const newLikedMovies = new Set(likedMovies);
        newLikedMovies.has(movieKey) ? newLikedMovies.delete(movieKey) : newLikedMovies.add(movieKey);
        setLikedMovies(newLikedMovies);
        localStorage.setItem('cratetv-likedMovies', JSON.stringify(Array.from(newLikedMovies)));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">My List</h1>
                    {watchlistMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {watchlistMovies.map(movie => (
                                <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 text-gray-500">
                             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            <h2 className="text-2xl font-bold text-gray-300">Your List is Empty</h2>
                            <p className="mt-2">Add shows and movies to your list to watch them later.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
            <BackToTopButton />

            {detailsMovie && (
                <MovieDetailsModal
                    movie={allMovies[detailsMovie.key] || detailsMovie}
                    isLiked={likedMovies.has(detailsMovie.key)}
                    onToggleLike={toggleLikeMovie}
                    onClose={handleCloseDetailsModal}
                    onSelectActor={handleSelectActor}
                    allMovies={allMovies}
                    allCategories={allCategories}
                    onSelectRecommendedMovie={handleSelectMovie}
                />
            )}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />}
        </div>
    );
};

export default WatchlistPage;