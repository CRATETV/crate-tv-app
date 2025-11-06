import React from 'react';
import { Movie } from '../types';

interface LiveWatchPartyBannerProps {
  movie: Movie;
  onClose: () => void;
}

const LiveWatchPartyBanner: React.FC<LiveWatchPartyBannerProps> = ({ movie, onClose }) => {
    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        window.history.pushState({}, '', `/watchparty/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    // The banner's position needs to account for the staging banner if it's present.
    const topOffset = sessionStorage.getItem('crateTvStaging') === 'true' ? '32px' : '0px';

    return (
        <div 
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 via-red-500 to-yellow-500 text-white p-3 flex items-center justify-center gap-4 shadow-lg h-12"
            style={{ top: topOffset }}
        >
            <div className="flex items-center gap-2 animate-pulse">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span className="font-bold">LIVE</span>
            </div>
            <p className="text-sm font-semibold text-center hidden sm:block">
                Watch Party for "{movie.title}" is happening now!
            </p>
            <a 
                href={`/watchparty/${movie.key}`} 
                onClick={handleNavigate}
                className="ml-4 bg-white text-black font-bold py-1 px-4 rounded-full text-sm hover:bg-gray-200 transition-colors flex-shrink-0"
            >
                Join
            </a>
            <button onClick={onClose} className="ml-2 text-white/70 hover:text-white transition-colors text-2xl leading-none" aria-label="Dismiss banner">
                &times;
            </button>
        </div>
    );
};

export default LiveWatchPartyBanner;