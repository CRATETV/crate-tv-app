import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Movie } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import Countdown from './Countdown';

interface LiveWatchPartyBannerProps {
  movie: Movie;
  onClose: () => void;
  onEnterLobby?: () => void;
}

const LiveWatchPartyBanner: React.FC<LiveWatchPartyBannerProps> = ({ movie, onClose, onEnterLobby }) => {
    const { hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys } = useAuth();
    const { festivalData, allPartyStates, refreshData } = useFestival();
    const [now, setNow] = useState(new Date());
    const [isAutoStarting, setIsAutoStarting] = useState(false);
    const [autoStartAttempted, setAutoStartAttempted] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // `activeParties` is filtered server-side to status==='live' docs only, so
    // once a party ends its doc simply isn't in there anymore — reading status
    // off of it meant `isEnded` could never actually become true (an ended
    // party looks identical to one that never started: partyState undefined).
    // `allPartyStates` includes every status, so it's the only reliable source
    // for "has this specific party actually ended."
    const partyState = allPartyStates[movie.key];
    const isExplicitlyLive = partyState?.status === 'live';
    // This used to be entirely absent — every check here was purely time-based
    // (elapsed time since the scheduled start), so once a party actually ended
    // the banner had no way to know that and just kept showing "Enter Lobby"/
    // "Starting Any Moment" as if nothing had happened, right up until the
    // 2-hour window below expired on its own. Checking the real status directly
    // means it reflects reality the moment the party actually ends, not just
    // whenever the clock says it probably should have.
    const isEnded = partyState?.status === 'ended';

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;

    const isUpcoming = startTime && now < startTime;
    // Keep showing banner for up to 2 hours after scheduled start
    // in case auto-start is delayed or Firestore is slow
    const isStartingSoon = startTime && now >= startTime &&
        now.getTime() - startTime.getTime() < 2 * 60 * 60 * 1000;
    const timeUntilStart = startTime ? startTime.getTime() - now.getTime() : 0;

    // Hide only if: not live AND not upcoming AND not ended AND more than 2hrs past start time
    if (!isExplicitlyLive && !isUpcoming && !isStartingSoon && !isEnded) return null;
    
    // Auto-start removed — party is now started manually from the Control Room.
    // This banner no longer tries to auto-start; it just shows the countdown
    // and waits for the admin to click Start in the Control Room.
    const attemptAutoStart = useCallback(async () => {
        // No-op — manual Control Room flow only
        return;
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
        const parentBlock = festivalData.flatMap(d => d.blocks || []).find(b => b.movieKeys.includes(movie.key));
        if (parentBlock && unlockedFestivalBlockIds.has(parentBlock.id)) return true;
        
        return false;
    }, [hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys, movie.key, festivalData]);

    const diff = startTime ? startTime.getTime() - now.getTime() : 0;
    const isUnderOneHour = startTime ? diff < 60 * 60 * 1000 : false;

    const handleNavigate = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isEnded) {
            // Once the party's over there's nothing to enter a lobby for —
            // send them to the festival catalog to actually watch instead.
            window.history.pushState({}, '', '/pwff');
            window.dispatchEvent(new Event('pushstate'));
            return;
        }
        if (onEnterLobby) {
            onEnterLobby();
        } else {
            window.history.pushState({}, '', `/watchparty/${movie.key}`);
            window.dispatchEvent(new Event('pushstate'));
        }
    };

    // Position banner below the fixed header (header is ~64px tall on desktop)
    const stagingOffset = sessionStorage.getItem('crateTvStaging') === 'true' ? 32 : 0;
    const topOffset = `${stagingOffset}px`;

    return (
        <div
            className="fixed left-0 right-0 z-[110] flex items-center justify-between gap-2 md:gap-4 shadow-2xl border-b border-white/10 transition-all"
            style={{
                top: topOffset,
                background: isEnded
                    ? 'linear-gradient(to right, #065f46, #047857, #312e81)'
                    : movie.isWatchPartyPaid && !alreadyHasAccess
                    ? 'linear-gradient(to right, #dc2626, #d97706, #312e81)'
                    : 'linear-gradient(to right, #dc2626, #db2777, #312e81)',
                paddingTop: 'max(8px, env(safe-area-inset-top))',
                paddingBottom: '8px',
                paddingLeft: '8px',
                paddingRight: '8px',
                minHeight: 'calc(48px + env(safe-area-inset-top))',
                // iOS Safari has a long-standing WebKit bug where `position: fixed`
                // elements flicker, lag, or briefly vanish during scroll — most
                // often on elements the compositor didn't promote to their own
                // GPU layer. Forcing that promotion is the standard fix and is
                // almost certainly why this ribbon was "appearing/disappearing"
                // on iPhone specifically (this bug doesn't happen on Android/
                // desktop Chrome, which don't have the same fixed-position quirk).
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
            }}
        >
            <div className="flex items-center gap-2 md:gap-4 ml-1 md:ml-8">
                <span className="relative flex h-2.5 w-2.5">
                    {!isEnded && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75`}></span>}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-white ${isLive ? 'shadow-[0_0_10px_white]' : ''}`}></span>
                </span>
                <span className="font-black text-[9px] md:text-[10px] uppercase tracking-widest md:tracking-[0.3em] whitespace-nowrap">
                    {isEnded ? 'SCREENING ENDED' : movie.isWatchPartyPaid && !alreadyHasAccess ? 'TICKETED EVENT' : (isLive ? 'LIVE NOW' : 'UPCOMING SESSION')}
                </span>
            </div>

            <div className="flex-grow text-center overflow-hidden flex items-center justify-center gap-2 md:gap-6">
                <p className="text-[9px] md:text-xs font-black truncate uppercase tracking-tight hidden sm:block">
                    {movie.title}
                </p>
                {isEnded ? (
                    <div className="bg-emerald-500/20 px-3 md:px-4 py-1 rounded-full border border-emerald-400/30 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span className="text-[9px] md:text-[10px] font-black text-emerald-200 uppercase tracking-widest">Now Available On-Demand</span>
                    </div>
                ) : isAutoStarting ? (
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
                ) : isStartingSoon && !isLive ? (
                    // isStartingSoon is purely time-based (within the post-start window),
                    // so without the `!isLive` guard a party that actually went live right
                    // on schedule would sit here showing "Starting Any Moment" instead of
                    // "Live Transmission Active" for its first two hours.
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
                    {isEnded ? 'Watch Now' : isLive ? 'Join Party' : 'Enter Lobby'}
                </button>
            </div>
        </div>
    );
};

export default LiveWatchPartyBanner;