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
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [decryptedEmail, setDecryptedEmail] = useState('');

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

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };

    const runDecryption = () => {
        if (!profile?.email || isDecrypting || decryptedEmail) return;
        
        setIsDecrypting(true);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@._-';
        let iterations = 0;
        const target = profile.email;
        
        const interval = setInterval(() => {
            const current = target.split('').map((char, index) => {
                if (index < iterations) return char;
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            
            setDecryptedEmail(current);
            iterations += 1;
            
            if (iterations >= target.length + 1) {
                clearInterval(interval);
                setIsDecrypting(false);
                // Open mailto after short delay
                setTimeout(() => {
                    const subject = encodeURIComponent(`Inquiry via Crate TV Directory: ${profile.name}`);
                    const body = encodeURIComponent(`Hello ${profile.name},\n\nI discovered your profile on Crate TV and would like to discuss a potential opportunity.\n\nRegards,`);
                    window.location.href = `mailto:${target}?subject=${subject}&body=${body}`;
                }, 500);
            }
        }, 40);
    };

    if (isLoading) return <LoadingSpinner />;

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
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={handleMobileSearch} showSearch={false} />
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
                            className="w-48 h-48 rounded-full object-cover border-4 border-red-600 flex-shrink-0 bg-gray-700 shadow-2xl"
                        />
                        <div>
                            <h1 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{profile.name}</h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                                <button 
                                    onClick={runDecryption}
                                    disabled={isDecrypting}
                                    className="bg-white text-black font-black text-xs px-8 py-3 rounded-xl hover:bg-gray-200 transition-all transform active:scale-95 shadow-xl uppercase tracking-widest flex items-center gap-3 min-w-[200px] justify-center"
                                >
                                    {isDecrypting && <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>}
                                    {decryptedEmail || (isDecrypting ? 'Decrypting...' : 'Contact Talent')}
                                </button>
                                {profile.imdbUrl && (
                                    <a href={profile.imdbUrl} target="_blank" rel="noopener noreferrer" className="bg-[#f5c518] text-black font-black text-xs px-6 py-3 rounded-xl hover:bg-yellow-400 transition-all shadow-md uppercase tracking-widest">
                                        Professional Profile
                                    </a>
                                )}
                            </div>
                            {decryptedEmail && !isDecrypting && (
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-3 animate-pulse">Electronic mail session established</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto p-4 md:p-8 -mt-24 relative z-20">
                     <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl shadow-2xl mb-12">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-4">The Narrative</h2>
                        <p className="text-gray-300 text-lg leading-relaxed font-medium">{profile.bio}</p>
                    </div>

                    <section>
                        <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">Crate TV Exhibition History</h2>
                        {films.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                {films.map(movie => (
                                    <MovieCard 
                                        key={movie.key} 
                                        movie={movie} 
                                        onSelectMovie={handleSelectMovie} 
                                        isLiked={likedMovies.includes(movie.key)}
                                        onToggleLike={toggleLikeMovie}
                                        isOnWatchlist={watchlist.includes(movie.key)}
                                        onToggleWatchlist={toggleWatchlist}
                                        isWatched={watchedMovies.includes(movie.key)}
                                    />
                                ))}
                            </div>
                        ) : (
                             <p className="text-gray-600 font-bold uppercase tracking-widest text-sm">Catalog record pending update.</p>
                        )}
                    </section>
                </div>
            </main>
            <Footer />
            <BackToTopButton />
            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default ActorProfilePage;