import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';
import BackToTopButton from './BackToTopButton';
import SEO from './SEO';
import { ActorProfile, Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import BottomNavBar from './BottomNavBar';

interface ActorProfilePageProps {
    slug: string;
}

const TalentInquiryModal: React.FC<{ actor: ActorProfile; onClose: () => void }> = ({ actor, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const res = await fetch('/api/send-talent-inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorName: actor.name, senderName: name, senderEmail: email, message })
            });
            if (res.ok) setStatus('success');
            else setStatus('error');
        } catch (e) { setStatus('error'); }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[150] p-4" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                {status === 'success' ? (
                    <div className="text-center py-8 space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tighter">Inquiry Secured</h3>
                        <p className="text-gray-400 text-sm">Your message has been routed to our talent coordination team. We will review and bridge the connection if appropriate.</p>
                        <button onClick={onClose} className="mt-4 bg-white text-black font-black py-3 px-8 rounded-xl uppercase text-xs tracking-widest">Close Terminal</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">Professional Inquiry</h3>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Target: {actor.name}</p>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} className="form-input !bg-white/5" required />
                            <input type="email" placeholder="Professional Email" value={email} onChange={e => setEmail(e.target.value)} className="form-input !bg-white/5" required />
                            <textarea placeholder="Reason for inquiry..." value={message} onChange={e => setMessage(e.target.value)} className="form-input !bg-white/5 h-32" required />
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                            <button type="submit" disabled={status === 'sending'} className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-xl transition-all">
                                {status === 'sending' ? 'Transmitting...' : 'Send Inquiry'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const ActorProfilePage: React.FC<ActorProfilePageProps> = ({ slug }) => {
    const [profile, setProfile] = useState<ActorProfile | null>(null);
    const [films, setFilms] = useState<Movie[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInquiryModal, setShowInquiryModal] = useState(false);

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

    const firstName = profile.name.split(' ')[0];
    const canReach = profile.isContactable !== false; // Default to true unless explicitly disabled

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <SEO 
                title={profile.name}
                description={profile.bio}
                image={profile.photo}
                type="profile"
                schemaData={{
                    "@type": "ProfilePage",
                    "mainEntity": {
                        "@type": "Person",
                        "name": profile.name,
                        "description": profile.bio,
                        "image": profile.photo,
                        "sameAs": [profile.imdbUrl].filter(Boolean)
                    }
                }}
            />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={handleMobileSearch} showSearch={false} />
            <main className="flex-grow">
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
                                {canReach ? (
                                    <button 
                                        onClick={() => setShowInquiryModal(true)}
                                        className="bg-white text-black font-black text-xs px-8 py-3 rounded-xl hover:bg-gray-200 transition-all transform active:scale-95 shadow-xl uppercase tracking-widest flex items-center gap-3 min-w-[200px] justify-center"
                                    >
                                        Contact Talent
                                    </button>
                                ) : (
                                    <div className="bg-white/5 border border-white/10 text-gray-500 font-black text-[9px] px-6 py-3 rounded-xl uppercase tracking-widest">
                                        Direct Contact Locked
                                    </div>
                                )}
                                {profile.imdbUrl && (
                                    <a href={profile.imdbUrl} target="_blank" rel="noopener noreferrer" className="bg-[#f5c518] text-black font-black text-xs px-6 py-3 rounded-xl hover:bg-yellow-400 transition-all shadow-md uppercase tracking-widest">
                                        Professional Profile
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto p-4 md:p-8 -mt-24 relative z-20">
                     <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl shadow-2xl mb-12">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-4">The Narrative</h2>
                        <p className="text-gray-300 text-lg leading-relaxed font-medium">{profile.bio}</p>
                    </div>

                    <section>
                        <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">Other films {firstName} has appeared in</h2>
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
            {showInquiryModal && <TalentInquiryModal actor={profile} onClose={() => setShowInquiryModal(false)} />}
        </div>
    );
};

export default ActorProfilePage;