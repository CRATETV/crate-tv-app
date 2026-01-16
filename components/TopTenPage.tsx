
import React, { useMemo, useRef, useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import SEO from './SEO';
import TopTenShareableImage from './TopTenShareableImage';

const RankCard: React.FC<{ movie: Movie; rank: number; onSelect: (m: Movie) => void; views: number }> = ({ movie, rank, onSelect, views }) => (
    <div 
        onClick={() => onSelect(movie)}
        className="group relative flex items-center bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-red-600/30 p-4 md:p-8 rounded-[2.5rem] transition-all duration-500 cursor-pointer overflow-hidden animate-[fadeIn_0.5s_ease-out]"
        style={{ animationDelay: `${rank * 100}ms` }}
    >
        <span 
            className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[12rem] md:text-[18rem] leading-none select-none opacity-[0.03] group-hover:opacity-[0.08] transition-opacity italic"
            style={{ WebkitTextStroke: '2px white', color: 'transparent' }}
        >
            {rank}
        </span>

        <div className="relative z-10 flex items-center gap-6 md:gap-12 w-full">
            <div className="flex-shrink-0 flex items-center justify-center w-12 md:w-20">
                <span className="text-3xl font-black text-white/20 group-hover:text-red-500 transition-colors italic">#{rank}</span>
            </div>
            
            <div className="relative w-20 h-28 md:w-32 md:h-44 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform duration-500">
                <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex-grow min-w-0">
                <h3 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter italic group-hover:text-red-500 transition-colors truncate leading-none">
                    {movie.title}
                </h3>
                {views > 0 && (
                    <div className="mt-4">
                        <p className="text-xl md:text-3xl font-black text-red-600 italic tracking-tighter">
                            {views.toLocaleString()}
                        </p>
                    </div>
                )}
            </div>

            <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                </div>
            </div>
        </div>
    </div>
);

const TopTenPage: React.FC = () => {
    const { movies, analytics, isLoading } = useFestival();
    const [isGenerating, setIsGenerating] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    
    const sortedMovies = useMemo(() => {
        return (Object.values(movies) as Movie[])
            .filter(m => !!m && !m.isUnlisted && !!m.poster)
            .sort((a, b) => (analytics?.viewCounts?.[b.key] || 0) - (analytics?.viewCounts?.[a.key] || 0))
            .slice(0, 10);
    }, [movies, analytics]);

    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleExport = async () => {
        if (!exportRef.current || isGenerating) return;
        setIsGenerating(true);

        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(exportRef.current, {
                useCORS: true,
                backgroundColor: '#050505',
                scale: 2.0, // High fidelity
                logging: false,
                width: 1080,
                height: 1920,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    // Ensure the cloned element is visible for capture
                    const el = clonedDoc.getElementById('export-container');
                    if (el) el.style.display = 'block';
                }
            });

            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            link.download = `CrateTV_Top10_${new Date().toISOString().split('T')[0]}.jpg`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Export failure:", err);
            alert("Digital synthesis failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <SEO title="Top 10 Today" description="Current audience leaderboard on Crate TV." />
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            
            <main className="flex-grow pt-32 pb-32 px-4 md:px-12">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                        <div>
                            <p className="text-red-500 font-black uppercase tracking-[0.5em] text-[10px] mb-4">Official Leaderboard</p>
                            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic">Top 10 Today.</h1>
                        </div>
                        <button 
                            onClick={handleExport}
                            disabled={isGenerating}
                            className="bg-white text-black font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {isGenerating ? 'Synthesizing...' : 'Download Social Asset'}
                        </button>
                    </div>

                    <div className="space-y-6">
                        {sortedMovies.map((movie, index) => (
                            <RankCard 
                                key={movie.key} 
                                movie={movie} 
                                rank={index + 1} 
                                views={analytics?.viewCounts?.[movie.key] || 0}
                                onSelect={handleSelectMovie}
                            />
                        ))}
                    </div>
                </div>
            </main>
            
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }} />

            {/* Hidden export target - Precisely mapped to 1080x1920 */}
            <div className="fixed left-[-9999px] top-0 overflow-hidden" aria-hidden="true">
                <div id="export-container" ref={exportRef} style={{ width: '1080px', height: '1920px' }}>
                    <TopTenShareableImage 
                        topFilms={sortedMovies.map(m => ({ 
                            key: m.key, 
                            title: m.title, 
                            poster: m.poster 
                        }))} 
                        date={new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} 
                    />
                </div>
            </div>
        </div>
    );
};

export default TopTenPage;
