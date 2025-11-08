import React, { useMemo, useState, useRef } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import MovieCarousel from './MovieCarousel';
import TopTenShareableImage from './TopTenShareableImage';
import html2canvas from 'html2canvas';

const TopTenPage: React.FC = () => {
    const { isLoading, movies } = useFestival();
    const { likedMovies, toggleLikeMovie, watchlist, watchedMovies } = useAuth();
    
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
            const canvas = await html2canvas(shareableImageRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 1, // Reduced scale for stability
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create image blob.');

            const file = new File([blob], 'cratetv_top10.png', { type: 'image/png' });
            const shareUrl = `${window.location.origin}/top-ten`;
            const shareText = `Check out the current Top 10 films on Crate TV! #indiefilm #cratetv\n${shareUrl}`;
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                // Native mobile sharing
                await navigator.share({
                    title: 'Top 10 on Crate TV',
                    text: shareText,
                    files: [file],
                });
            } else {
                // Desktop fallback: copy link and download image
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
                    console.error("Could not copy text, falling back to download only:", copyError);
                    // If clipboard fails for any reason, just download the image.
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

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
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
                     <div className="relative w-full h-[50vh] md:h-[60vh] bg-black mb-12">
                         <img
                            src={`/api/proxy-image?url=${encodeURIComponent(heroMovie.poster)}`}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                            onContextMenu={(e) => e.preventDefault()}
                            crossOrigin="anonymous"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                         <div className="relative z-10 flex flex-col justify-end h-full p-4 md:p-12 text-center items-center">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-2" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.7)' }}>
                                Top 10 on Crate TV
                            </h1>
                            <p className="text-lg text-gray-300">The most-loved films by the community, right now.</p>
                             <div className="relative mt-6">
                                <button
                                    onClick={handleShare}
                                    disabled={isGenerating}
                                    className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 backdrop-blur-sm disabled:bg-gray-500/50"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                                            Share List
                                        </>
                                    )}
                                </button>
                                 {desktopShareStatus === 'success' && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-lg animate-[fadeIn_0.5s_ease-out]">
                                        Image downloaded & link copied!
                                    </div>
                                )}
                            </div>
                         </div>
                     </div>
                )}
               
                <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-20">
                    <MovieCarousel
                        title=""
                        movies={topTenMovies}
                        onSelectMovie={handleSelectMovie}
                        showRankings={true}
                        watchedMovies={new Set(watchedMovies)}
                        watchlist={new Set(watchlist)}
                        likedMovies={new Set(likedMovies)}
                        onToggleLike={toggleLikeMovie}
                        onSupportMovie={() => { /* Not applicable here */ }}
                    />
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