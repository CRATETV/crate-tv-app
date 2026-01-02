import React, { useMemo, useState, useRef, useEffect } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import TopTenShareableImage from './TopTenShareableImage';
import SEO from './SEO';

const RankCard: React.FC<{ movie: Movie; rank: number; onSelect: (m: Movie) => void }> = ({ movie, rank, onSelect }) => (
    <div 
        onClick={() => onSelect(movie)}
        className="group relative flex items-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-red-600/30 p-4 md:p-8 rounded-[2rem] transition-all duration-500 cursor-pointer overflow-hidden animate-[fadeIn_0.5s_ease-out]"
        style={{ animationDelay: `${rank * 100}ms` }}
    >
        {/* Massive Background Rank Number */}
        <span 
            className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[12rem] md:text-[18rem] leading-none select-none opacity-[0.03] group-hover:opacity-[0.08] transition-opacity italic"
            style={{ WebkitTextStroke: '2px white', color: 'transparent' }}
        >
            {rank}
        </span>

        <div className="relative z-10 flex items-center gap-6 md:gap-12 w-full">
            <div className="flex-shrink-0 flex items-center justify-center w-12 md:w-20">
                <span className="text-4xl md:text-6xl font-black text-white italic group-hover:text-red-600 transition-colors">
                    {rank.toString().padStart(2, '0')}
                </span>
            </div>

            <div className="relative w-24 h-36 md:w-32 md:h-48 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                <img 
                    src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} 
                    alt="" 
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                />
            </div>

            <div className="flex-grow min-w-0 space-y-2 md:space-y-4">
                <div className="space-y-1">
                    <p className="text-red-500 font-black uppercase tracking-[0.4em] text-[8px] md:text-[10px]">Active Leaderboard // SECTOR {rank}</p>
                    <h3 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter truncate leading-none">{movie.title}</h3>
                    <p className="text-gray-500 font-bold uppercase text-[10px] md:text-xs tracking-widest">Dir. {movie.director}</p>
                </div>
                
                <div className="flex items-center gap-4 md:gap-8 pt-2 md:pt-4 border-t border-white/5">
                    <div className="hidden sm:block">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Audience Sentiment</p>
                        <p className="text-sm font-bold text-white uppercase">High Velocity</p>
                    </div>
                    <div>
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Platform Sync</p>
                        <p className="text-sm font-bold text-green-500 uppercase">Verified</p>
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0 hidden md:flex items-center justify-center w-20 h-20 rounded-full border border-white/10 group-hover:bg-red-600 group-hover:border-red-600 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
    </div>
);

const TopTenPage: React.FC = () => {
    const { isLoading, movies } = useFestival();
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareStatus, setShareStatus] = useState<'idle' | 'success'>('idle');
    const shareableImageRef = useRef<HTMLDivElement>(null);
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const topTenMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter((movie): movie is Movie => !!movie && !!movie.title && !movie.isUnlisted)
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);
    
    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };
    
    const handleShare = async () => {
        if (!shareableImageRef.current || isGenerating) return;
        setIsGenerating(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(shareableImageRef.current, { useCORS: true, backgroundColor: '#050505', scale: 2 });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create image blob.');
            const file = new File([blob], 'cratetv_top10.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ title: 'Top 10 on Crate TV', files: [file] });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'cratetv_top10.png';
                link.click();
                setShareStatus('success');
                setTimeout(() => setShareStatus('idle'), 3000);
            }
        } catch (error) {
            console.error("Share failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    const heroMovie = topTenMovies[0];
    const chartMovies = topTenMovies.slice(1);

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
            <SEO title="Top 10 Today" description="The most streamed and liked independent films on Crate TV right now." />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />
            
            <main className="flex-grow pt-24 pb-24 md:pb-32 px-4 md:px-12 relative overflow-hidden">
                {/* Visual Flair */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[150px] pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto space-y-16">
                    {/* Prestigious Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/5 pb-16">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-10 bg-red-600 rounded-full"></span>
                                <div>
                                    <p className="text-red-500 font-black uppercase tracking-[0.6em] text-[10px] leading-none">Global Network Feed</p>
                                    <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none italic mt-2">The Chart.</h1>
                                </div>
                            </div>
                            <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl leading-tight">
                                Live ranking of the most impactful independent cinema on the Crate TV Infrastructure as of <span className="text-white font-bold">{currentDate}</span>.
                            </p>
                        </div>
                        <button 
                            onClick={handleShare}
                            disabled={isGenerating}
                            className="bg-white text-black font-black px-10 py-5 rounded-2xl text-xs uppercase tracking-widest shadow-2xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isGenerating ? 'Synthesizing...' : 'Export Session Report'}
                        </button>
                    </div>

                    {/* Rank #1 Spotlight */}
                    {heroMovie && (
                        <section 
                            onClick={() => handleSelectMovie(heroMovie)}
                            className="relative w-full h-[60vh] md:h-[75vh] rounded-[4rem] overflow-hidden group cursor-pointer border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,1)] animate-[fadeIn_1s_ease-out]"
                        >
                            <img 
                                src={`/api/proxy-image?url=${encodeURIComponent(heroMovie.poster)}`} 
                                alt="" 
                                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-20"
                                crossOrigin="anonymous"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                            
                            <div className="relative h-full flex flex-col items-center justify-center p-8 md:p-20 text-center space-y-8">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-3 bg-red-600 px-6 py-2 rounded-full shadow-2xl animate-bounce">
                                        <span className="text-white font-black text-sm uppercase tracking-widest italic">Peak Performance #01</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.8em] pt-4">Global Selection Winner</p>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-12">
                                     <div className="relative">
                                        <div className="absolute -inset-4 bg-red-600/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                        <img 
                                            src={`/api/proxy-image?url=${encodeURIComponent(heroMovie.poster)}`} 
                                            alt={heroMovie.title} 
                                            className="w-48 md:w-80 h-auto rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,1)] border border-white/10 relative z-10 transition-transform duration-700 group-hover:rotate-[-2deg] group-hover:scale-105"
                                            crossOrigin="anonymous"
                                        />
                                     </div>
                                     <div className="text-center md:text-left max-w-2xl">
                                        <h2 className="text-5xl md:text-8xl lg:text-[10rem] font-black uppercase tracking-tighter leading-[0.8] mb-8 italic italic-text drop-shadow-[0_10px_20px_rgba(0,0,0,1)]">
                                            {heroMovie.title}
                                        </h2>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                            <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Director</p>
                                                <p className="text-lg font-bold text-white uppercase truncate">{heroMovie.director}</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</p>
                                                <p className="text-lg font-bold text-red-500 uppercase">Masterwork</p>
                                            </div>
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Ranks 2-10 Leaderboard */}
                    <section className="space-y-6 pt-16">
                        <div className="flex items-center gap-4 px-8 mb-10">
                            <h2 className="text-2xl font-black uppercase tracking-widest text-gray-600">The Ascent</h2>
                            <div className="h-px flex-grow bg-white/5"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {chartMovies.map((movie, index) => (
                                <RankCard 
                                    key={movie.key} 
                                    movie={movie} 
                                    rank={index + 2} 
                                    onSelect={handleSelectMovie} 
                                />
                            ))}
                        </div>
                    </section>
                </div>
            </main>

            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />

            {/* Hidden Shareable Image Component */}
            {topTenMovies.length > 0 && (
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                    <div ref={shareableImageRef}>
                        <TopTenShareableImage topFilms={topTenMovies} date={currentDate} />
                    </div>
                </div>
            )}

            <style>{`
                .italic-text { font-style: italic; }
            `}</style>
        </div>
    );
};

export default TopTenPage;