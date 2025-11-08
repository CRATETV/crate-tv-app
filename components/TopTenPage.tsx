import React, { useMemo, useState, useRef } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import TopTenShareableImage from './TopTenShareableImage';
// Lazy load html2canvas by removing the static import
// import html2canvas from 'html2canvas';

const TopTenPage: React.FC = () => {
    const { isLoading, movies } = useFestival();
    const [isGenerating, setIsGenerating] = useState(false);
    const [desktopShareStatus, setDesktopShareStatus] = useState<'idle' | 'success'>('idle');
    const shareableImageRef = useRef<HTMLDivElement>(null);
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const topTenMovies = useMemo(() => {
        return Object.values(movies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
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
            // Dynamically import html2canvas only when needed
            const { default: html2canvas } = await import('html2canvas');
            
            const canvas = await html2canvas(shareableImageRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 1,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create image blob.');

            const file = new File([blob], 'cratetv_top10.png', { type: 'image/png' });
            const shareUrl = `${window.location.origin}/top-ten`;
            const shareText = `Check out the current Top 10 films on Crate TV! #indiefilm #cratetv\n${shareUrl}`;
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Top 10 on Crate TV',
                    text: shareText,
                    files: [file],
                });
            } else {
                 try {
                    await navigator.clipboard.writeText(shareText);
                    setDesktopShareStatus('success');
                    setTimeout(() => setDesktopShareStatus('idle'), 3000);

                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'cratetv_top10.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                } catch (copyError) {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'cratetv_top10.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                }
            }

        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                 console.error("Error generating or sharing image:", error);
                 alert("Sorry, we couldn't generate the shareable image. Please try again.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    const heroMovie = topTenMovies[0];
    const remainingMovies = topTenMovies.slice(1);

    return (
        <div className="flex flex-col min-h-screen text-white top-ten-page-bg">
            <Header
                searchQuery=""
                onSearch={() => {}}
                isScrolled={true}
                onMobileSearchClick={() => {}}
                showSearch={false}
                showNavLinks={false}
            />
            <main className="flex-grow pt-16 pb-24 md:pb-0">
                {heroMovie && (
                     <div className="relative w-full h-[60vh] md:h-[70vh] bg-black mb-12 flex items-center justify-center animate-slide-in-up">
                         <img
                            src={`/api/proxy-image?url=${encodeURIComponent(heroMovie.poster)}`}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-xl"
                            onContextMenu={(e) => e.preventDefault()}
                            crossOrigin="anonymous"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 px-4">
                            <img 
                                src={`/api/proxy-image?url=${encodeURIComponent(heroMovie.poster)}`}
                                alt={heroMovie.title}
                                className="w-48 md:w-64 h-auto rounded-lg shadow-2xl shadow-black"
                                crossOrigin="anonymous"
                            />
                            <div className="text-center md:text-left">
                                <p className="text-xl font-bold text-purple-400">#1 on Crate TV Today</p>
                                <h1 className="text-4xl md:text-6xl font-extrabold text-white mt-2 mb-4" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.7)' }}>
                                    {heroMovie.title}
                                </h1>
                                <button
                                    onClick={() => handleSelectMovie(heroMovie)}
                                    className="bg-white text-black font-bold py-3 px-8 rounded-lg transition-transform hover:scale-105"
                                >
                                    Watch Now
                                </button>
                            </div>
                         </div>
                     </div>
                )}
               
                <div className="max-w-4xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center mb-6 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                        <h2 className="text-3xl font-bold">Top 10 Today</h2>
                        <div className="relative">
                            <button
                                onClick={handleShare}
                                disabled={isGenerating}
                                className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-5 rounded-lg transition-colors flex items-center gap-2 backdrop-blur-sm disabled:bg-gray-500/50"
                            >
                                {isGenerating ? 'Generating...' : 'Share'}
                            </button>
                             {desktopShareStatus === 'success' && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-lg animate-[fadeIn_0.5s_ease-out]">
                                    Image downloaded & link copied!
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {remainingMovies.map((movie, index) => (
                            <div 
                                key={movie.key} 
                                className="top-ten-item group animate-slide-in-up" 
                                style={{ animationDelay: `${300 + index * 100}ms` }}
                                onClick={() => handleSelectMovie(movie)}
                            >
                                <div className="flex items-center gap-5">
                                    <span className="rank-number">{index + 2}</span>
                                    <img 
                                        src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`} 
                                        alt=""
                                        className="poster-img"
                                        crossOrigin="anonymous"
                                    />
                                    <h3 className="text-lg md:text-xl font-bold text-white flex-grow">{movie.title}</h3>
                                    <div className="play-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar 
                onSearchClick={() => {
                    window.history.pushState({}, '', '/');
                    window.dispatchEvent(new Event('pushstate'));
                }}
            />

            {/* Hidden component for generating the shareable image */}
            {topTenMovies.length > 0 && (
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                    <div ref={shareableImageRef}>
                        <TopTenShareableImage topFilms={topTenMovies} date={currentDate} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopTenPage;