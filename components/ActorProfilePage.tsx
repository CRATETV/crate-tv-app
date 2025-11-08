

import React, { useState, useEffect } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import { ActorProfile, Movie } from '../types';
import { MovieCard } from './MovieCard';
import MovieDetailsModal from './MovieDetailsModal'; // To reuse its detailed view

interface ActorProfilePageProps {
    slug: string;
}

const ActorProfilePage: React.FC<ActorProfilePageProps> = ({ slug }) => {
    const [profile, setProfile] = useState<ActorProfile | null>(null);
    const [films, setFilms] = useState<Movie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // State for modal
    const [detailsMovie, setDetailsMovie] = useState<Movie | null>(null);
    
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
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
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
        <div className="flex flex-col min-h-screen text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-5xl mx-auto">
                    <section className="relative flex flex-col md:flex-row items-center gap-8 bg-gray-800/50 border border-gray-700 rounded-lg p-8 mb-12">
                        <img
                            src={`/api/proxy-image?url=${encodeURIComponent("https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png")}`}
                            alt="Crate TV Logo"
                            crossOrigin="anonymous"
                            className="absolute top-4 left-4 w-24 h-auto opacity-20 pointer-events-none"
                        />
                        <img 
                            src={`/api/proxy-image?url=${encodeURIComponent(profile.highResPhoto)}`}
                            alt={profile.name}
                            crossOrigin="anonymous"
                            className="w-48 h-48 rounded-full object-cover border-4 border-purple-500 flex-shrink-0 bg-gray-700"
                        />
                        <div>
                            <h1 className="text-4xl font-bold text-white">{profile.name}</h1>
                            {profile.imdbUrl && (
                                <a href={profile.imdbUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 bg-[#f5c518] text-black font-bold text-sm px-3 py-1 rounded-md hover:bg-yellow-400 transition-colors">
                                    View on IMDb
                                </a>
                            )}
                            <p className="text-gray-300 leading-relaxed mt-4">{profile.bio}</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-3xl font-bold text-white mb-6">Appearances on Crate TV</h2>
                        {films.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {films.map(movie => (
                                    <MovieCard key={movie.key} movie={movie} onSelectMovie={handleSelectMovie} />
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
        </div>
    );
};

export default ActorProfilePage;