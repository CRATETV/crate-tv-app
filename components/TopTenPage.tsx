import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from './Header';
import Footer from './Footer';
import BackToTopButton from './BackToTopButton';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BottomNavBar from './BottomNavBar';
import CollapsibleFooter from './CollapsibleFooter';
import { useFestival } from '../contexts/FestivalContext';
import TopTenList from './TopTenList';
import TopTenShareableImage from './TopTenShareableImage';
import html2canvas from 'html2canvas';

const TopTenPage: React.FC = () => {
    const { isLoading, movies } = useFestival();
    const [currentDate, setCurrentDate] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const shareableImageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCurrentDate(new Date().toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }));
    }, []);

    const topTenMovies = useMemo(() => {
        return Object.values(movies)
            .filter((movie: Movie): movie is Movie => !!movie && typeof movie.likes === 'number')
            .sort((a: Movie, b: Movie) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 10);
    }, [movies]);
    
    const handleSelectMovie = (movie: Movie) => {
        window.history.pushState({}, '', `/movie/${movie.key}?play=true`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleShareImage = async () => {
        if (!shareableImageRef.current || isGenerating) return;

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(shareableImageRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 1, // Use scale 1 for 1080x1080
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create image blob.');

            const file = new File([blob], 'cratetv_top10.png', { type: 'image/png' });
            
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Top 10 on Crate TV',
                    text: `Check out the current Top 10 films on Crate TV! #indiefilm #cratetv`,
                    files: [file],
                });
            } else {
                // Fallback for browsers that don't support Web Share API with files
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'cratetv_top10.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }

        } catch (error) {
            console.error("Error generating or sharing image:", error);
            alert("Sorry, we couldn't generate the shareable image. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

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
            <main className="flex-grow pt-24 pb-24 md:pb-0 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center text-center sm:text-left mb-12">
                        <div>
                             <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">
                                Top 10 Today
                            </h1>
                            <p className="text-lg text-gray-400">{currentDate}</p>
                        </div>
                         <button
                            onClick={handleShareImage}
                            disabled={isGenerating}
                            className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm no-print disabled:bg-blue-800 disabled:cursor-wait self-center sm:self-auto"
                        >
                            {isGenerating ? 'Generating...' : 'Share as Image'}
                        </button>
                    </div>

                    <TopTenList movies={topTenMovies} onSelectMovie={handleSelectMovie} />
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
