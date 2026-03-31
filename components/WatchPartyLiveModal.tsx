import React, { useState, useMemo } from 'react';
import { Movie, FilmBlock, WatchPartyState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import SquarePaymentModal from './SquarePaymentModal';

interface WatchPartyLiveModalProps {
    onClose: () => void;
}

/**
 * WATCH PARTY LIVE MODAL
 * 
 * Shows once when user lands on Festival page and a Watch Party is live.
 * 
 * Access Logic:
 * - Full Festival Pass → Free access to all Watch Parties
 * - Paid for this specific block → Free access to this Watch Party + those films unlocked later
 * - No access → Must pay for the block to join
 */
const WatchPartyLiveModal: React.FC<WatchPartyLiveModalProps> = ({ onClose }) => {
    const { user, hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys, unlockFestivalBlock, unlockWatchParty } = useAuth();
    const { festivalData, activeParties, movies, festivalConfig } = useFestival();
    
    const [showPayment, setShowPayment] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<FilmBlock | null>(null);

    // Find all currently live watch parties with their blocks
    const liveWatchParties = useMemo(() => {
        const parties: Array<{
            block: FilmBlock;
            movies: Movie[];
            partyState: WatchPartyState;
            hasAccess: boolean;
        }> = [];

        for (const day of festivalData) {
            for (const block of day.blocks) {
                // Check if this block has an active watch party
                const blockPartyKey = `block_${block.id}`;
                const partyState = activeParties[blockPartyKey];
                
                if (partyState && partyState.status === 'live') {
                    const blockMovies = block.movieKeys
                        .map(key => movies[key])
                        .filter((m): m is Movie => !!m);
                    
                    // Check if user has access
                    const hasAccess = hasFestivalAllAccess || 
                        unlockedFestivalBlockIds.has(block.id) ||
                        block.movieKeys.some(key => unlockedWatchPartyKeys.has(key));
                    
                    parties.push({
                        block,
                        movies: blockMovies,
                        partyState,
                        hasAccess
                    });
                }
            }
        }

        // Also check for individual movie watch parties
        for (const [movieKey, partyState] of Object.entries(activeParties)) {
            if (movieKey.startsWith('block_')) continue; // Already handled above
            if (partyState.status !== 'live') continue;
            
            const movie = movies[movieKey];
            if (!movie) continue;

            // Find the block this movie belongs to
            const parentBlock = festivalData
                .flatMap(d => d.blocks)
                .find(b => b.movieKeys.includes(movieKey));

            if (parentBlock) {
                // Check if we already have this block
                const existingIndex = parties.findIndex(p => p.block.id === parentBlock.id);
                if (existingIndex === -1) {
                    const hasAccess = hasFestivalAllAccess || 
                        unlockedFestivalBlockIds.has(parentBlock.id) ||
                        unlockedWatchPartyKeys.has(movieKey);

                    parties.push({
                        block: parentBlock,
                        movies: [movie],
                        partyState,
                        hasAccess
                    });
                }
            }
        }

        return parties;
    }, [festivalData, activeParties, movies, hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys]);

    // If no live watch parties, don't show modal
    if (liveWatchParties.length === 0) {
        return null;
    }

    const handleJoinParty = (party: typeof liveWatchParties[0]) => {
        if (party.hasAccess) {
            // User has access - navigate to watch party
            const firstMovieKey = party.block.movieKeys[0];
            window.history.pushState({}, '', `/watchparty/${firstMovieKey}`);
            window.dispatchEvent(new Event('pushstate'));
            onClose();
        } else {
            // User needs to pay - show payment modal
            setSelectedBlock(party.block);
            setShowPayment(true);
        }
    };

    const handlePaymentSuccess = async (details: { paymentType: string, itemId?: string, amount: number, email?: string }) => {
        if (!selectedBlock || !user) return;
        
        // Unlock the block for the user
        await unlockFestivalBlock(selectedBlock.id);
        
        // Also unlock individual watch party keys for the movies in this block
        for (const movieKey of selectedBlock.movieKeys) {
            await unlockWatchParty(movieKey);
        }
        
        setShowPayment(false);
        
        // Navigate to the watch party
        const firstMovieKey = selectedBlock.movieKeys[0];
        window.history.pushState({}, '', `/watchparty/${firstMovieKey}`);
        window.dispatchEvent(new Event('pushstate'));
        onClose();
    };

    const primaryParty = liveWatchParties[0];

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-red-500/30 animate-[scaleIn_0.3s_ease-out]">
                    
                    {/* Live indicator bar */}
                    <div className="bg-gradient-to-r from-red-600 via-pink-600 to-red-600 p-3 flex items-center justify-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-[0_0_10px_white]"></span>
                        </span>
                        <span className="font-black text-sm uppercase tracking-[0.3em] text-white">
                            Watch Party Live Now
                        </span>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8">
                        {/* Block title */}
                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight italic text-center mb-2">
                            {primaryParty.block.title}
                        </h2>
                        <p className="text-gray-400 text-center text-sm mb-6">
                            {festivalConfig?.title || 'CrateFest'} • {primaryParty.movies.length} {primaryParty.movies.length === 1 ? 'Film' : 'Films'}
                        </p>

                        {/* Movie posters */}
                        <div className="flex justify-center gap-3 mb-6 overflow-x-auto py-2">
                            {primaryParty.movies.slice(0, 4).map((movie, idx) => (
                                <div 
                                    key={movie.key}
                                    className="relative flex-shrink-0 w-24 md:w-32 aspect-[2/3] rounded-xl overflow-hidden border-2 border-white/10 shadow-xl transform hover:scale-105 transition-transform"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <img 
                                        src={movie.poster} 
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Currently playing indicator */}
                                    {idx === (primaryParty.partyState.activeMovieIndex || 0) && (
                                        <div className="absolute inset-0 border-2 border-red-500 rounded-xl">
                                            <div className="absolute bottom-0 left-0 right-0 bg-red-600 py-1 text-center">
                                                <span className="text-[8px] font-black uppercase tracking-wider">Now Playing</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {primaryParty.movies.length > 4 && (
                                <div className="flex-shrink-0 w-24 md:w-32 aspect-[2/3] rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                                    <span className="text-2xl font-black text-white/40">+{primaryParty.movies.length - 4}</span>
                                </div>
                            )}
                        </div>

                        {/* Access status */}
                        {primaryParty.hasAccess ? (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
                                <p className="text-green-400 font-bold text-sm">
                                    ✓ You have access to this Watch Party
                                </p>
                                <p className="text-green-400/60 text-xs mt-1">
                                    {hasFestivalAllAccess ? 'Full Festival Pass' : 'Block Unlocked'}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-center">
                                <p className="text-amber-400 font-bold text-sm">
                                    🎟️ Ticket Required
                                </p>
                                <p className="text-amber-400/60 text-xs mt-1">
                                    ${primaryParty.block.price?.toFixed(2) || '5.00'} for this block • Films unlocked after Watch Party
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
                            Join viewers watching together in real-time. Chat, react, and experience the films as a community.
                            {!primaryParty.hasAccess && (
                                <span className="block mt-2 text-white/60">
                                    After the Watch Party, these films will be <strong className="text-white">unlocked for you</strong> to watch anytime.
                                </span>
                            )}
                        </p>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => handleJoinParty(primaryParty)}
                                className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black py-4 px-8 rounded-full uppercase tracking-wider text-sm transition-all transform hover:scale-105 shadow-lg shadow-red-500/30"
                            >
                                {primaryParty.hasAccess ? (
                                    <>
                                        <span className="mr-2">▶</span> Join Watch Party
                                    </>
                                ) : (
                                    <>
                                        <span className="mr-2">🎟️</span> Get Ticket & Join
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold py-4 px-8 rounded-full uppercase tracking-wider text-sm transition-all border border-white/10"
                            >
                                Maybe Later
                            </button>
                        </div>

                        {/* Multiple parties notice */}
                        {liveWatchParties.length > 1 && (
                            <p className="text-center text-gray-500 text-xs mt-6">
                                {liveWatchParties.length} Watch Parties are currently live
                            </p>
                        )}
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {showPayment && selectedBlock && (
                <SquarePaymentModal
                    block={selectedBlock}
                    paymentType="block"
                    onClose={() => setShowPayment(false)}
                    onPaymentSuccess={handlePaymentSuccess}
                    priceOverride={selectedBlock.price}
                />
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
};

export default WatchPartyLiveModal;
