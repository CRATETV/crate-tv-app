
import React, { useMemo, useState, useEffect } from 'react';
import { Movie } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Countdown from './Countdown';

interface LiveWatchPartyBannerProps {
  movie: Movie;
  onClose: () => void;
}

const LiveWatchPartyBanner: React.FC<LiveWatchPartyBannerProps> = ({ movie, onClose }) => {
    const { unlockedWatchPartyKeys } = useAuth();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hasAccess = useMemo(() => {
        if (!movie.isWatchPartyPaid) return true;
        return unlockedWatchPartyKeys.has(movie.key);
    }, [movie, unlockedWatchPartyKeys]);

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
    const isLive = startTime && now >= startTime;
    const isPreShow = startTime && now < startTime && (startTime.getTime() - now.getTime() < 15 * 60 * 1000);

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        window.history.pushState({}, '', `/watchparty/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const topOffset = sessionStorage.getItem('crateTvStaging') === 'true' ? '32px' : '0px';

    if (!isLive && !isPreShow) return null;

    return (
        <div 
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-pink-600 to-indigo-900 text-white p-3 flex items-center justify-between gap-4 shadow-2xl h-12 border-b border-white/10 animate-[slideInDown_0.4s_ease-out]"
            style={{ top: topOffset }}
        >
            <div className="flex items-center gap-4 ml-2 md:ml-8">
                <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 bg-white ${isLive ? 'shadow-[0_0_10px_white]' : ''}`}></span>
                </span>
                <span className="font-black text-[10px] uppercase tracking-[0.3em] whitespace-nowrap">
                    {isLive ? 'Live Event Active' : 'Uplink Imminent'}
                </span>
            </div>
            
            <div className="flex-grow text-center overflow-hidden flex items-center justify-center gap-4">
                <p className="text-xs font-black truncate uppercase tracking-tight hidden sm:block">
                    {movie.title}
                </p>
                {isPreShow && (
                    <div className="bg-black/40 px-3 py-0.5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Commencing In</span>
                        <Countdown targetDate={movie.watchPartyStartTime!} className="text-[10px] font-mono font-black text-white" prefix="" />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mr-2 md:mr-8">
                <button 
                    onClick={handleNavigate}
                    className="bg-white text-black font-black px-5 py-1 rounded-full text-[10px] uppercase tracking-tighter hover:bg-gray-200 transition-all flex-shrink-0"
                >
                    {isLive ? (hasAccess ? 'Enter Room' : 'Get Ticket') : 'Pre-Show Lobby'}
                </button>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl leading-none ml-2" aria-label="Dismiss banner">
                    &times;
                </button>
            </div>
        </div>
    );
};

export default LiveWatchPartyBanner;
