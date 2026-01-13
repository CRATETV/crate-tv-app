
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
    const { watchlist, toggleWatchlist, likedMovies, toggleLikeMovie, watchedMovies } = useAuth();

    const publicAccessMovies = useMemo(() => {
        const category = categories.publicAccess;
        if (!category) return [];
        return category.movieKeys
            .map(key => movies[key])
            .filter((m): m is Movie => !!m && !m.isUnlisted);
    }, [movies, categories]);
    
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
                description="The digital town hall for community cinema. Free access to civic dispatches, student works, and preserved records." 
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
                <div className="relative py-24 md:py-48 border-b border-white/5">
                    <div className="max-w-7xl mx-auto text-center px-4 animate-[fadeIn_0.8s_ease-out]">
                        <div className="inline-flex items-center gap-3 bg-emerald-600/10 border border-emerald-500/20 px-4 py-1.5 rounded-full mb-8 shadow-2xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-emerald-400 font-black uppercase tracking-[0.4em] text-[10px]">Civic Infrastructure // Open Node</p>
                        </div>
                        <h1 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] italic mb-8">
                            The <span className="text-emerald-500">Square.</span>
                        </h1>
                        <p className="text-xl md:text-3xl text-gray-400 max-w-3xl mx-auto font-medium leading-tight tracking-tight">
                           A permanent digital stage for communal record, student performance, and the voices that build our cities.
                        </p>
                    </div>
                </div>

                {/* The Mission: Grant-Ready Narrative */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-24 border-b border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
                        <div className="space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-none">Democratizing the record.</h2>
                            <div className="space-y-6 text-gray-400 text-lg leading-relaxed font-medium">
                                <p>Crate TV believes that media literacy and distribution are human rights. <span className="text-white">The Public Square</span> is our commitment to civic utility—a sector removed from commercial pressure.</p>
                                <p>This space is grant-subsidized, allowing us to preserve student works and local dispatches at high-bitrate standards. By providing professional-grade distribution to non-commercial work, we bridge the gap in the digital media economy.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-8 bg-emerald-600/10 border border-emerald-500/20 rounded-[2.5rem] shadow-2xl group hover:bg-emerald-600/20 transition-all">
                                <p className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Institutional Pillar 01</p>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Digital Equity</h3>
                                <p className="text-sm text-gray-500 mt-2">Zero-cost access for the community, ensuring high-quality culture is never paywalled.</p>
                            </div>
                            <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-xl">
                                <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Institutional Pillar 02</p>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Civic Record</h3>
                                <p className="text-sm text-gray-500 mt-2">A permanent digital home for community journalism and experimental student dispatches.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Dispatches Grid */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-24">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-widest text-white italic">Active Dispatches</h2>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Status: Open Stream // Secure Feed</p>
                        </div>
                        <div className="h-px flex-grow bg-white/5 mx-10 hidden md:block"></div>
                        <div className="flex items-center gap-2 bg-emerald-600/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Public Session: $0.00</span>
                        </div>
                    </div>

                    {publicAccessMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                            {publicAccessMovies.map(movie => (
                                <div key={movie.key} className="hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] rounded-lg transition-all duration-500 transform hover:scale-105">
                                    <MovieCard 
                                        movie={movie} 
                                        onSelectMovie={handleSelectMovie} 
                                        isOnWatchlist={watchlist.includes(movie.key)}
                                        onToggleWatchlist={toggleWatchlist}
                                        isLiked={likedMovies.includes(movie.key)}
                                        onToggleLike={toggleLikeMovie}
                                        isWatched={watchedMovies.includes(movie.key)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[4rem] opacity-30">
                            <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Establishing Local Uplink Feed...</p>
                        </div>
                    )}
                </div>

                {/* Square Labs (Planned Dispatches) */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 pb-48">
                    <div className="mb-16">
                        <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-500 italic">Planned Labs</h2>
                        <p className="text-[10px] text-gray-800 font-black uppercase tracking-widest mt-1">Status: Narrative Pipeline Active</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "Civic Town Halls", desc: "Live-streamed community discussions with local creators and civic leaders using our Watch Party tech." },
                            { title: "Student Premieres", desc: "Providing the same prestigious exhibition platform to the next generation of filmmakers as our award winners." },
                            { title: "History Preserved", desc: "Restoring and hosting independent media archives to ensure community history remains accessible." }
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/5 p-10 rounded-[3rem] space-y-6 group hover:border-emerald-500/30 transition-all shadow-xl">
                                <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-all text-xs font-black">
                                    0{i+1}
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white group-hover:text-emerald-400 transition-colors leading-tight">{item.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                                <div className="pt-4">
                                    <span className="text-[8px] font-black bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">Incoming Transmission</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={handleMobileSearch} />
        </div>
    );
};

export default PublicSquarePage;
