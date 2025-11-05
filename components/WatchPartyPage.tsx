import React, { useEffect, useMemo, useRef } from 'react';
import { useFestival } from '../contexts/FestivalContext';
import LoadingSpinner from './LoadingSpinner';
import { Movie } from '../types';

interface WatchPartyPageProps {
  movieKey: string;
}

const WatchPartyChat: React.FC = () => {
    return (
        <div className="bg-gray-900 border-l border-gray-700 h-full flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Watch Party Chat</h2>
            </div>
            <div className="flex-grow p-4 flex items-center justify-center text-gray-500">
                <p>Chat coming soon!</p>
            </div>
            <div className="p-4 border-t border-gray-700">
                <input type="text" placeholder="Say something..." className="form-input" disabled />
            </div>
        </div>
    );
};


const WatchPartyPage: React.FC<WatchPartyPageProps> = ({ movieKey }) => {
    const { movies, isLoading } = useFestival();
    const movie = useMemo(() => movies[movieKey], [movies, movieKey]);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!isLoading && !movie) {
            window.history.replaceState({}, '', '/');
            window.dispatchEvent(new Event('pushstate'));
        }
    }, [isLoading, movie]);

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    if (isLoading || !movie) {
        return <LoadingSpinner />;
    }

    return (
        <div className="h-screen w-screen bg-black flex flex-col">
            <header className="p-4 bg-gray-900/80 flex justify-between items-center z-10">
                <div>
                    <h1 className="text-xl font-bold text-white">{movie.title}</h1>
                    <p className="text-sm text-gray-400">Watch Party</p>
                </div>
                <button onClick={handleGoHome} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Exit Watch Party
                </button>
            </header>
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                <div className="flex-grow bg-black flex items-center justify-center">
                    <video 
                        ref={videoRef}
                        src={movie.fullMovie}
                        className="w-full h-full max-h-full"
                        controls
                        autoPlay
                    />
                </div>
                <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-1/2 md:h-full">
                    <WatchPartyChat />
                </div>
            </div>
        </div>
    );
};

export default WatchPartyPage;
