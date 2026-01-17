
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

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
    const isLive = startTime && now >= startTime;
    const isPreShow = startTime && now < startTime && (startTime.getTime() - now.getTime() < 60 * 60 * 1000);

    const handleNavigate = (e: React.MouseEvent) => {
        if (!isLive) return;
        e.preventDefault();
        window.history.pushState({}, '', `/watchparty/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const topOffset = sessionStorage.getItem('crateTvStaging') === 'true' ? '32px' : '0px';

    if (!isLive && !isPreShow) return null;

    return (
        <div 
            className={`fixed top-0 left-0 right-0 z-50 p-2 md:p-3 flex items-center justify-between gap-2 md:gap-4 shadow-2xl h-10 md:h-12 border-b border-white/10 animate-[slideInDown:0.4s_ease-out] transition-all ${movie.isWatchPartyPaid ? 'bg-gradient-to-r from-red-600 via-amber-600 to-indigo-900' : 'bg-gradient-to-r from-red-600 via-pink-600 to-indigo-900'}`}
            style={{ top: topOffset }}
        >
            <div className="flex items-center gap-2 md:gap-4 ml-1 md:ml-8">
                <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-white ${isLive ? 'shadow-[0_0_10px_white]' : ''}`}></span>
                </span>
                <span className="font-black text-[8px] md:text-[10px] uppercase tracking-widest md:tracking-[0.3em] whitespace-nowrap">
                    {movie.isWatchPartyPaid ? 'TICKETED' : (isLive ? 'LIVE' : 'UPCOMING')}
                </span>
            </div>
            
            <div className="flex-grow text-center overflow-hidden flex items-center justify-center gap-2 md:gap-6">
                <p className="text-[9px] md:text-xs font-black truncate uppercase tracking-tight hidden sm:block">
                    {movie.title}
                </p>
                {isPreShow ? (
                    <div className="bg-black/40 px-2 md:px-4 py-0.5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest hidden md:block">Commencing In</span>
                        <Countdown targetDate={movie.watchPartyStartTime!} className="text-[8px] md:text-[11px] font-mono font-black text-white" prefix="" />
                    </div>
                ) : isLive && (
                    <div className="bg-white/10 px-2 md:px-4 py-0.5 rounded-full border border-white/20 flex items-center gap-2">
                        <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest">Live Now</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mr-1 md:mr-8">
                <button 
                    onClick={handleNavigate}
                    disabled={!isLive}
                    className={`font-black px-3 md:px-6 py-1 rounded-full text-[8px] md:text-[10px] uppercase tracking-tighter transition-all flex-shrink-0 ${isLive ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'}`}
                >
                    {isLive ? 'Join Room' : 'Synchronizing...'}
                </button>
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none ml-1" aria-label="Dismiss banner">
                    &times;
                </button>
            </div>
        </div>
    );
};

export default LiveWatchPartyBanner;
