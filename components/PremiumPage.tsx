import React, { useState, useEffect, useMemo } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import LoadingSpinner from './LoadingSpinner';
import { MovieCard } from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal';
import ActorBioModal from './ActorBioModal';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie, Actor, Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import SquarePaymentModal from './SquarePaymentModal';

const PremiumPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [likedMovies, setLikedMovies] = useState<Set<string>>(new Set());
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // FIX: Destructure 'subscribe' from useAuth to handle premium subscriptions.
    const { user, subscribe } = useAuth();

    useEffect(() => {
        const loadData = async () => {
            try {
                // FIX: Destructured `data` from the `fetchAndCacheLiveData` result.
                const { data: liveData } = await fetchAndCacheLiveData();
                setMovies(liveData.movies);
                setCategories(liveData.categories);

                const storedLikedMovies = localStorage.getItem('cratetv-likedMovies');
                if (storedLikedMovies) {
                    setLikedMovies(new Set(JSON.parse(storedLikedMovies)));
                }
            } catch (error) {
                console.error("Failed to load data for Premium page:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const premiumMovies = useMemo(() => {
        if (!categories.premium) return [];
        return categories.premium.movieKeys.map(key => movies[key]).filter(Boolean);
    }, [movies, categories]);

    const handleSelectMovie = (movie: Movie) => setDetailsMovie(movie);
    const handleCloseDetailsModal = () => setDetailsMovie(null);
    const handleSelectActor = (actor: Actor) => setSelectedActor(actor);
    const handleCloseActorModal = () => setSelectedActor(null);
    
    const handleSubscribe = () => {
        if (!user) {
            // If not logged in, redirect to login page with intent to subscribe
            window.history.pushState({}, '', '/login?redirect=/premium&action=subscribe');
            window.dispatchEvent(new Event('pushstate'));
        } else {
            setIsPaymentModalOpen(true);
        }
    };
    
    const handlePaymentSuccess = () => {
        // This is where you would update the user's subscription status
        // For the demo, we'll call the context's subscribe function
        subscribe();
    };

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
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="flex-grow">
                <div className="relative py-24 md:py-32 bg-gray-900 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-800/40 via-red-900/40 to-black"></div>
                    <div className="relative z-10 max-w-4xl mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Unlock Crate TV Premium</h1>
                        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
                            Get exclusive access to our entire library of premium films, extended director's cuts, and special features for just $4.99/month.
                        </p>
                        {/* FIX: Check for isPremiumSubscriber property on user object. */}
                        {!user?.isPremiumSubscriber && (
                            <button 
                                onClick={handleSubscribe} 
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-xl shadow-lg transition-transform hover:scale-105"
                            >
                                Join Premium
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-4 sm:p-8 md:p-12">
                    <h2 className="text-3xl font-bold text-white mb-6">Exclusive Premium Content</h2>
                    
                    {/* FIX: Check for isPremiumSubscriber property on user object. */}
                    {user?.isPremiumSubscriber ? (
                         premiumMovies.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                                {premiumMovies.map(movie => (
                                    <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-400">
                                <p>More premium content is coming soon. Stay tuned!</p>
                            </div>
                        )
                    ) : (
                         <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                             {premiumMovies.slice(0, 12).map(movie => (
                                <div key={movie.key} className="opacity-50">
                                    {/* FIX: Allow non-subscribers to open the details modal. */}
                                    <MovieCard movie={movie} onSelectMovie={handleSelectMovie} />
                                </div>
                            ))}
                             {/* FIX: Make the overlay non-blocking so cards can be clicked. */}
                             <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent flex items-end justify-center p-8 pointer-events-none">
                                <div className="text-center pointer-events-auto">
                                    <h3 className="text-2xl font-bold text-white mb-4">Join Premium to Watch</h3>
                                    <button onClick={handleSubscribe} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                                        Subscribe Now
                                    </button>
                                </div>
                             </div>
                         </div>
                    )}
                </div>
            </main>

            <Footer />
            <BackToTopButton />

            {detailsMovie && (
                // FIX: Pass necessary props for subscription flow to the modal.
                <MovieDetailsModal
                    movie={movies[detailsMovie.key] || detailsMovie}
                    isLiked={likedMovies.has(detailsMovie.key)}
                    onToggleLike={toggleLikeMovie}
                    onClose={handleCloseDetailsModal}
                    onSelectActor={handleSelectActor}
                    allMovies={movies}
                    allCategories={categories}
                    onSelectRecommendedMovie={handleSelectMovie}
                    // FIX: Added missing 'onSupportMovie' prop to satisfy the MovieDetailsModalProps interface. In this context, "support" triggers the subscription flow.
                    onSupportMovie={handleSubscribe}
                    onSubscribe={handleSubscribe}
                    isPremiumMovie={true}
                    isPremiumSubscriber={user?.isPremiumSubscriber}
                />
            )}
            {selectedActor && <ActorBioModal actor={selectedActor} onClose={handleCloseActorModal} />}
            {isPaymentModalOpen && (
                <SquarePaymentModal
                    paymentType="subscription"
                    onClose={() => setIsPaymentModalOpen(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
};

export default PremiumPage;