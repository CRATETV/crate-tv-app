
import React, { useMemo } from 'react';
import { Movie } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LiveWatchPartyBannerProps {
  movie: Movie;
  onClose: () => void;
}

const LiveWatchPartyBanner: React.FC<LiveWatchPartyBannerProps> = ({ movie, onClose }) => {
    const { unlockedWatchPartyKeys } = useAuth();

    const hasAccess = useMemo(() => {
        if (!movie.isWatchPartyPaid) return true;
        return unlockedWatchPartyKeys.has(movie.key);
    }, [movie, unlockedWatchPartyKeys]);

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        window.history.pushState({}, '', `/watchparty/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    // Account for potential top-level banners like Staging
    const topOffset = sessionStorage.getItem('crateTvStaging') === 'true' ? '32px' : '0px';

    return (
        <div 
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-pink-600 to-indigo-900 text-white p-3 flex items-center justify-between gap-4 shadow-2xl h-12 border-b border-white/10"
            style={{ top: topOffset }}
        >
            <div className="flex items-center gap-4 animate-pulse ml-2 md:ml-8">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
                <span className="font-black text-[10px] uppercase tracking-[0.3em] whitespace-nowrap">Live Stream Active</span>
            </div>
            
            <div className="flex-grow text-center overflow-hidden">
                <p className="text-xs font-bold truncate uppercase tracking-tight">
                    {movie.title}
                </p>
            </div>

            <div className="flex items-center gap-2 mr-2 md:mr-8">
                {movie.isWatchPartyPaid && !hasAccess && (
                    <span className="hidden sm:block text-[8px] font-black uppercase tracking-widest text-white/50 border border-white/20 px-2 py-0.5 rounded-full">Ticketed</span>
                )}
                {hasAccess && (
                    <span className="hidden sm:block text-[8px] font-black uppercase tracking-widest text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">✓ Authorized</span>
                )}
                <button 
                    onClick={handleNavigate}
                    className="bg-white text-black font-black px-5 py-1 rounded-full text-[10px] uppercase tracking-tighter hover:bg-gray-200 transition-all flex-shrink-0"
                >
                    {hasAccess ? 'Enter Live Room' : (movie.isWatchPartyPaid ? 'Buy Ticket' : 'Join Party')}
                </button>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl leading-none ml-2" aria-label="Dismiss banner">
                    &times;
                </button>
            </div>
        </div>
    );
};

export default LiveWatchPartyBanner;
