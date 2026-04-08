import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Movie } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import Countdown from './Countdown';

interface LiveWatchPartyBannerProps {
  movie: Movie;
  onClose: () => void;
}

const LiveWatchPartyBanner: React.FC<LiveWatchPartyBannerProps> = ({ movie, onClose }) => {
    const { hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys } = useAuth();
    const { festivalData, activeParties, refreshData } = useFestival();
    const [now, setNow] = useState(new Date());
    const [isAutoStarting, setIsAutoStarting] = useState(false);
    const [autoStartAttempted, setAutoStartAttempted] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const partyState = activeParties[movie.key];
    const isExplicitlyLive = partyState?.status === 'live';

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
    
    const isUpcoming = startTime && now < startTime;
    // Keep showing banner for up to 2 hours after scheduled start
    // in case auto-start is delayed or Firestore is slow
    const isStartingSoon = startTime && now >= startTime && 
        now.getTime() - startTime.getTime() < 2 * 60 * 60 * 1000;
    const timeUntilStart = startTime ? startTime.getTime() - now.getTime() : 0;
    
    // Hide only if: not live AND not upcoming AND more than 2hrs past start time
    if (!isExplicitlyLive && !isUpcoming && !isStartingSoon) return null;
    
    // Auto-start when countdown reaches zero
    const attemptAutoStart = useCallback(async () => {
        if (isAutoStarting || autoStartAttempted || isExplicitlyLive) return;
        
        setIsAutoStarting(true);
        setAutoStartAttempted(true);
        
        try {
            const response = await fetch('/api/auto-start-watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movieKey: movie.key })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                console.log('[AUTO-START] Watch party started successfully');
                // Refresh data to pick up the new live state
                if (refreshData) refreshData();
            } else {
                console.log('[AUTO-START] Could not auto-start:', data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('[AUTO-START] Error:', error);
        } finally {
            setIsAutoStarting(false);
        }
    }, [movie.key, isAutoStarting, autoStartAttempted, isExplicitlyLive, refreshData]);

    // Trigger auto-start when countdown reaches zero (within 5 second window)
    useEffect(() => {
        if (!isExplicitlyLive && startTime && timeUntilStart <= 0 && timeUntilStart > -5000 && !autoStartAttempted) {
            attemptAutoStart();
        }
    }, [timeUntilStart, isExplicitlyLive, startTime, autoStartAttempted, attemptAutoStart]);
    
    const isLive = isExplicitlyLive;
    
    // Authorization check for the banner button
    const alreadyHasAccess = useMemo(() => {
        if (hasFestivalAllAccess) return true;
        if (unlockedWatchPartyKeys.has(movie.key)) return true;
        
        // Check if this movie belongs to any unlocked block
        const parentBlock = festivalData.flatMap(d => d.blocks).find(b => b.movieKeys.includes(movie.key));
        if (parentBlock && unlockedFestivalBlockIds.has(parentBlock.id)) return true;
        
        return false;
    }, [hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys, movie.key, festivalData]);

    const diff = startTime ? startTime.getTime() - now.getTime() : 0;
    const isUnderOneHour = startTime ? diff < 60 * 60 * 1000 : false;

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        // Allow navigation to lobby even before live (for countdown/waiting experience)
        window.history.pushState({}, '', `/watchparty/${movie.key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const topOffset = sessionStorage.getItem('crateTvStaging') === 'true' ? '32px' : '0px';

    return (
        <div 
            className={`fixed top-0 left-0 right-0 z-50 p-2 md:p-3 flex items-center justify-between gap-2 md:gap-4 shadow-2xl h-12 border-b border-white/10 animate-[slideInDown:0.4s_ease-out] transition-all ${movie.isWatchPartyPaid && !alreadyHasAccess ? 'bg-gradient-to-r from-red-600 via-amber-600 to-indigo-900' : 'bg-gradient-to-r from-red-600 via-pink-600 to-indigo-900'}`}
            style={{ top: topOffset }}
        >
            <div className="flex items-center gap-2 md:gap-4 ml-1 md:ml-8">
                <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-white ${isLive ? 'shadow-[0_0_10px_white]' : ''}`}></span>
                </span>
                <span className="font-black text-[9px] md:text-[10px] uppercase tracking-widest md:tracking-[0.3em] whitespace-nowrap">
                    {movie.isWatchPartyPaid && !alreadyHasAccess ? 'TICKETED EVENT' : (isLive ? 'LIVE NOW' : 'UPCOMING SESSION')}
                </span>
            </div>
            
            <div className="flex-grow text-center overflow-hidden flex items-center justify-center gap-2 md:gap-6">
                <p className="text-[9px] md:text-xs font-black truncate uppercase tracking-tight hidden sm:block">
                    {movie.title}
                </p>
                {isAutoStarting ? (
                    <div className="bg-green-500/30 px-3 md:px-4 py-1 rounded-full border border-green-400/50 flex items-center gap-2 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-spin"></span>
                        <span className="text-[9px] md:text-[10px] font-black text-green-200 uppercase tracking-widest">Launching...</span>
                    </div>
                ) : isUpcoming ? (
                    <div className="bg-black/40 px-3 md:px-4 py-1 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest hidden md:block">
                            {isUnderOneHour ? 'Commencing In' : 'Synchronizing Uplink In'}
                        </span>
                        <Countdown targetDate={movie.watchPartyStartTime!} className="text-[9px] md:text-[11px] font-mono font-black text-white" prefix="" />
                    </div>
                ) : isStartingSoon ? (
                    <div className="bg-amber-500/20 px-3 md:px-4 py-1 rounded-full border border-amber-400/30 flex items-center gap-2 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-[9px] md:text-[10px] font-black text-amber-200 uppercase tracking-widest">Starting Any Moment</span>
                    </div>
                ) : isLive && (
                    <div className="bg-white/10 px-3 md:px-4 py-1 rounded-full border border-white/20 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest">Live Transmission Active</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 mr-1 md:mr-8">
                <button 
                    onClick={handleNavigate}
                    className="font-black px-4 md:px-6 py-1.5 rounded-full text-[9px] md:text-[10px] uppercase tracking-tighter transition-all flex-shrink-0 bg-white text-black hover:bg-gray-200"
                >
                    {isLive ? 'Join Party' : 'Enter Lobby'}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white transition-colors ml-1 flex-shrink-0" 
                    aria-label="Dismiss banner"
                >
                    <span className="text-base leading-none">&times;</span>
                </button>
            </div>
        </div>
    );
};

export default LiveWatchPartyBanner;