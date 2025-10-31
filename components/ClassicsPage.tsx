import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import MovieCarousel from './MovieCarousel';
import MovieDetailsModal from './MovieDetailsModal';
import ActorBioModal from './ActorBioModal';
import LoadingSpinner from './LoadingSpinner';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Actor, Category } from '../types';

const ClassicsPage: React.FC = () => {
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
                console.error("Failed to load data for Classics page:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const classicMovies = useMemo(() => {
        const classicsCategory = categories.publicDomainIndie;
        if (!classicsCategory) return [];
        return classicsCategory.movieKeys
            .map(key => movies[key])
            .filter((m): m is Movie => !!m);
    }, [movies, categories]);
    
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
                    <div className="mb-12 text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Public Domain Classics</h1>
                        <p className="text-lg text-gray-400 max-w-3xl mx-auto">
                            Explore a curated collection of influential silent films and early cinematic masterpieces that have entered the public domain.
                        </p>
                    </div>

                    {classicMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                            {classicMovies.map(movie => (
                                <div key={movie.key} className="cursor-pointer group" onClick={() => handleSelectMovie(movie)}>
                                    <img src={movie.poster} alt={movie.title} className="w-full h-auto rounded-md transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">No classic films are available at this time.</p>
                    )}
                </div>
            </main>

            <Footer />
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
                    showSupportButton={false}
                />
            )}
            {selectedActor && (
                <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />
            )}
        </div>
    );
};

export default ClassicsPage;