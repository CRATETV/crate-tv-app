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

const PublicAccessPage: React.FC = () => {
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
        <div className="flex flex-col min-h-screen text-white bg-black selection:bg-indigo-600">
            <SEO 
                title="The Commons" 
                description="Grant-subsidized public access infrastructure for community preservation and independent voices." 
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
                {/* Visual Background Flourish */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-indigo-600/5 blur-[120px] pointer-events-none rounded-full"></div>

                {/* Aesthetic Hero */}
                <div className="relative py-24 md:py-44 border-b border-white/5">
                    <div className="max-w-7xl mx-auto text-center px-4 animate-[fadeIn_0.8s_ease-out]">
                        <div className="inline-flex items-center gap-3 bg-indigo-600/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-8 shadow-2xl">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px]">Civic Infrastructure // Strategic Wing</p>
                        </div>
                        <h1 className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] italic mb-8">
                            The <span className="text-indigo-500">Commons.</span>
                        </h1>
                        <p className="text-xl md:text-3xl text-gray-400 max-w-3xl mx-auto font-medium leading-tight tracking-tight">
                           A community-owned stage for independent dispatches, student works, and preserved cinematic records.
                        </p>
                    </div>
                </div>

                {/* Grant-Ready Narrative Block */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-24 border-b border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
                        <div className="space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic">Democratizing the Stage.</h2>
                            <div className="space-y-6 text-gray-400 text-lg leading-relaxed font-medium">
                                <p>Crate TV believes that cinema is a public utility. While our premium vault supports filmmakers through direct patronage, <span className="text-white">The Commons</span> exists to ensure that culturally vital community work is never silenced by a financial barrier.</p>
                                <p>Supported by strategic grants and regional partnerships, this sector provides the same high-bitrate streaming infrastructure to all voices, ensuring that "Digital Equity" remains at the core of our distribution mission.</p>
                            </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[3rem] shadow-2xl space-y-10">
                            <div className="flex justify-between items-start">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">Institutional Values</h3>
                                <span className="text-[10px] font-mono text-gray-700">HASH_COMMONS_V4</span>
                            </div>
                            <div className="grid grid-cols-1 gap-6">
                                <div className="p-6 bg-black border border-white/5 rounded-2xl">
                                    <p className="text-white font-bold uppercase text-xs mb-1">Combatting Digital Poverty</p>
                                    <p className="text-xs text-gray-500 leading-relaxed">Providing world-class distribution tools to underrepresented creators.</p>
                                </div>
                                <div className="p-6 bg-black border border-white/5 rounded-2xl">
                                    <p className="text-white font-bold uppercase text-xs mb-1">Cinematic Preservation</p>
                                    <p className="text-xs text-gray-500 leading-relaxed">A permanent digital record for community-focused and student-produced cinema.</p>
                                </div>
                                <div className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
                                    <p className="text-indigo-400 font-bold uppercase text-xs mb-1">Access Cost: $0.00</p>
                                    <p className="text-xs text-gray-500 leading-relaxed">Subsidized by grants to remain free for the community, forever.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Archive Grid */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 py-24">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
                        <div>
                            <h2 className="text-3xl font-black uppercase tracking-widest text-white italic">Active Archive</h2>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Status: Open Node // Verified Transmission</p>
                        </div>
                        <div className="h-px flex-grow bg-white/5 mx-10 hidden md:block"></div>
                        <div className="flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Public Session Active</span>
                        </div>
                    </div>

                    {publicAccessMovies.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                            {publicAccessMovies.map(movie => (
                                <div key={movie.key} className="hover:shadow-[0_0_50px_rgba(79,70,229,0.15)] rounded-lg transition-all duration-500 transform hover:scale-105">
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
                            <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Synchronizing Initial Community Stream...</p>
                        </div>
                    )}
                </div>

                {/* Planned Dispatches (Coming Soon) */}
                <div className="max-w-7xl mx-auto px-4 md:px-12 pb-32">
                    <div className="mb-16">
                        <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-500 italic">Planned Dispatches</h2>
                        <p className="text-[10px] text-gray-700 font-black uppercase tracking-widest mt-1">Status: Ingest Pipeline Active</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: "Community Talkbacks", desc: "Live-streamed town hall discussions with local Philadelphia filmmakers and curators." },
                            { title: "Student Showcases", desc: "Providing a professional premiere platform for the next generation of visual storytellers." },
                            { title: "Preservation Labs", desc: "Digital restorations of historical community footage and independent masterpieces." }
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/5 p-10 rounded-[3rem] space-y-6 group hover:border-indigo-500/30 transition-all shadow-xl">
                                <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all text-xs font-black">
                                    0{i+1}
                                </div>
                                <h3 className="text