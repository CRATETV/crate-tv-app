import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import BackToTopButton from './BackToTopButton';
import MovieCard from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal';
import ActorBioModal from './ActorBioModal';
import LoadingSpinner from './LoadingSpinner';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Actor, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';

const WatchlistPage: React.FC = () => {
    const { user, watchlist } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies);
                setCategories(data.categories);
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
        return watchlist
            .map(key => movies[key])
            .filter((m): m is Movie => !!m);
    }, [movies, watchlist]);
    
    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    const handleCloseDetailsModal = () => setDetailsMovie(null);
    const handleSelectActor = (actor: Actor) => {
        setDetailsMovie(null);
        setSelectedActor(actor);
    };
    const handleCloseActorModal = () => setSelectedActor(null);

    const toggleLikeMovie = (movieKey: string) => {
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
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true}
                onMobileSearchClick={() => {}}
            />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">My List</h1>
                    {watchlistMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {watchlistMovies.map(movie => (
                                <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <h2 className="text-2xl font-semibold text-gray-300">Your List is Empty</h2>
                            <p className="text-gray-500 mt-2">Add shows and movies to your list to watch them later.</p>
                        </div>
                    )}
                </div>
            </main>
            <BackToTopButton />

            {detailsMovie && (
                <MovieDetailsModal
                    movie={movies[detailsMovie.key] || detailsMovie}
                    isLiked={likedMovies.has(detailsMovie.key)}
                    onToggleLike={toggleLikeMovie}
                    onClose={handleCloseDetailsModal}
                    onSelectActor={handleSelectActor}
                    allMovies={movies}
                    allCategories={categories}
                    onSelectRecommendedMovie={handleSelectMovie}
                />
            )}
            {selectedActor && (
                <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />
            )}
        </div>
    );
};

export default WatchlistPage;