
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import { ActorProfile, Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import BottomNavBar from './BottomNavBar';


interface ActorProfilePageProps {
    slug: string;
}

const ActorProfilePage: React.FC<ActorProfilePageProps> = ({ slug }) => {
    const [profile, setProfile] = useState<ActorProfile | null>(null);
    const [films, setFilms] = useState<Movie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const { likedMovies, toggleLikeMovie, watchlist, toggleWatchlist, watchedMovies } = useAuth();

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            setError('');
            try {
                const response = await fetch(`/api/get-public-actor-profile?slug=${slug}`);
                if (!response.ok) {
                     throw new Error('Actor profile not found.');
                }
                const data = await response.json();
                setProfile(data.profile);
                setFilms(data.films || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [slug]);

    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="flex flex-col min-h-screen text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <h1 className="text-2xl font-bold text-red-500">{error}</h1>
                </main>
                <Footer />
            </div>
        );
    }
    
    if (!profile) return null;

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow">
                {/* Hero Section */}
                <div className="relative w-full h-[60vh] bg-black">
                    <img
                        src={`/api/proxy-image?url=${encodeURIComponent(profile.highResPhoto)}`}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md"
                        crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                    <div className="relative z-10 h-full max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center md:justify-start gap-8 px-4 text-center md:text-left">
                        <img 
                            src={`/api/proxy-image?url=${encodeURIComponent(profile.photo)}`}
                            alt={profile.name}
                            crossOrigin="anonymous"
                            className="w-48 h-48 rounded-full object-cover border-4 border-purple-500 flex-shrink-0 bg-gray-700 shadow-lg"
                        />
                        <div>
                            <h1 className="text-4xl md:text-6xl font-extrabold text-white">{profile.name}</h1>
                            {profile.imdbUrl && (
                                <a href={profile.imdbUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 bg-[#f5c518] text-black font-bold text-sm px-4 py-1.5 rounded-md hover:bg-yellow-400 transition-colors shadow-md">
                                    View on IMDb
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="max-w-5xl mx-auto p-4 md:p-8 -mt-24 relative z-20">
                     <div className="bg-gray-800/80 backdrop-blur-md p-6 rounded-lg shadow-xl mb-12">
                        <h2 className="text-2xl font-bold text-white mb-3">About</h2>
                        <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
                    </div>

                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">Appearances on Crate TV</h2>
                        {films.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {films.map(movie => (
                                    <MovieCard 
                                        key={movie.key} 
                                        movie={movie} 
                                        onSelectMovie={handleSelectMovie} 
                                        isLiked={likedMovies.has(movie.key)}
                                        onToggleLike={toggleLikeMovie}
                                        isOnWatchlist={watchlist.includes(movie.key)}
                                        onToggleWatchlist={toggleWatchlist}
                                        isWatched={watchedMovies.includes(movie.key)}
                                    />
                                ))}
                            </div>
                        ) : (
                             <p className="text-gray-500">This actor has not appeared in any films on Crate TV yet.</p>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default ActorProfilePage;
