import React, { useState, useMemo } from 'react';
import { Movie, FestivalDay, FilmBlock, FestivalConfig } from '../types';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import SquarePaymentModal from './SquarePaymentModal';
import BottomNavBar from './BottomNavBar';
import WatchPartyLobby from './WatchPartyLobby';

// ─── FILM CARD ───────────────────────────────────────────────────────────────
const FilmEntry: React.FC<{
    movie: Movie;
    index: number;
    isBlockUnlocked: boolean;
    onWatchNow: () => void;
}> = ({ movie, index, isBlockUnlocked, onWatchNow }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="flex gap-4 md:gap-6 py-6 border-b border-white/5 last:border-0 group">
            {/* Index */}
            <div className="flex-shrink-0 w-8 text-right pt-1">
                <span className="text-[11px] font-black text-gray-700 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            </div>

            {/* Poster */}
            <div className="flex-shrink-0 w-16 md:w-20">
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-900 border border-white/5">
                    {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                    <h3 className="text-base md:text-lg font-black text-white uppercase tracking-tight leading-tight">
                        {movie.title}
                    </h3>
                    {isBlockUnlocked && (
                        <button
                            onClick={onWatchNow}
                            className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-full transition-all"
                        >
                            Watch Now
                        </button>
                    )}
                </div>

                <p className="text-xs text-red-500 font-black uppercase tracking-widest mb-2">
                    Directed by {movie.director}
                </p>

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 mb-3">
                    {movie.durationInMinutes && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {movie.durationInMinutes} min
                        </span>
                    )}
                    {movie.genres && movie.genres.length > 0 && movie.genres.map(g => (
                        <span key={g} className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">{g}</span>
                    ))}
                </div>

                {/* Synopsis */}
                {movie.synopsis && (
                    <div>
                        <p className={`text-sm text-gray-400 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                            {movie.synopsis}
                        </p>
                        {movie.synopsis.length > 120 && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest mt-1 transition-colors"
                            >
                                {expanded ? 'Show less ↑' : 'Read more ↓'}
                            </button>
                        )}
                    </div>
                )}

                {/* Cast */}
                {movie.cast && movie.cast.length > 0 && (
                    <p className="text-[10px] text-gray-600 mt-2">
                        <span className="text-gray-700 font-bold">Cast: </span>
                        {movie.cast.slice(0, 4).map(a => a.name).join(', ')}
                        {movie.cast.length > 4 && ` +${movie.cast.length - 4} more`}
                    </p>
                )}
            </div>
        </div>
    );
};

// ─── BLOCK SECTION ───────────────────────────────────────────────────────────
const BlockSection: React.FC<{
    block: FilmBlock;
    films: Movie[];
    dayLabel: string;
    isUnlocked: boolean;
    isLive: boolean;
    hasWatchParty: boolean;
    watchPartyPrice?: number;
    onBuyTicket: () => void;
    onEnterLobby: () => void;
    onWatchFilm: (key: string) => void;
}> = ({ block, films, dayLabel, isUnlocked, isLive, hasWatchParty, watchPartyPrice, onBuyTicket, onEnterLobby, onWatchFilm }) => {
    const totalRuntime = films.reduce((acc, m) => acc + (m.durationInMinutes || 0), 0);

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${isLive ? 'border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.15)]' : 'border-white/8'}`}>
            {/* Block header */}
            <div className="bg-white/[0.02] border-b border-white/5 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        {/* Live badge */}
                        {isLive && (
                            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-3 py-1 mb-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Live Screening</span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{dayLabel}</span>
                            {block.time && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{block.time}</span>
                                </>
                            )}
                            {totalRuntime > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                                    <span className="text-[10px] text-gray-600">{Math.floor(totalRuntime / 60)}h {totalRuntime % 60}m total</span>
                                </>
                            )}
                        </div>

                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">
                            {block.title}
                        </h2>
                        <p className="text-xs text-gray-500 mt-2">{films.length} film{films.length !== 1 ? 's' : ''} in this block</p>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                        {isLive ? (
                            <button
                                onClick={onEnterLobby}
                                className="bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
                            >
                                Join Live Now
                            </button>
                        ) : hasWatchParty && !isUnlocked ? (
                            <button
                                onClick={onBuyTicket}
                                className="bg-white hover:bg-gray-100 text-black font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
                            >
                                Get Ticket {watchPartyPrice ? `· $${watchPartyPrice.toFixed(2)}` : ''}
                            </button>
                        ) : isUnlocked ? (
                            <div className="inline-flex items-center gap-2 bg-green-900/20 border border-green-500/30 text-green-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                Ticket Confirmed
                            </div>
                        ) : null}

                        {hasWatchParty && block.watchPartyStartTime && !isLive && (
                            <p className="text-[10px] text-gray-600 text-center">
                                Screens {new Date(block.watchPartyStartTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(block.watchPartyStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Film list */}
            <div className="px-6 md:px-8">
                {films.length > 0 ? (
                    films.map((film, i) => (
                        <FilmEntry
                            key={film.key}
                            movie={film}
                            index={i}
                            isBlockUnlocked={isUnlocked}
                            onWatchNow={() => onWatchFilm(film.key)}
                        />
                    ))
                ) : (
                    <p className="py-8 text-center text-gray-700 text-xs uppercase tracking-widest font-black">
                        Programme coming soon
                    </p>
                )}
            </div>
        </div>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const FestivalProgramPage: React.FC = () => {
    const { festivalData, festivalConfig, movies, activeParties, isLoading, livePartyMovie } = useFestival();
    const { hasFestivalAllAccess, unlockedFestivalBlockIds, unlockFestivalBlock, grantFestivalAllAccess, unlockedWatchPartyKeys, user } = useAuth();

    const [activeDay, setActiveDay] = useState<number>(1);
    const [paymentItem, setPaymentItem] = useState<{ blockId?: string; type: 'block' | 'pass' | 'watchPartyTicket' } | null>(null);
    const [showLobbyFor, setShowLobbyFor] = useState<string | null>(null);

    const currentDayData = useMemo(() =>
        festivalData.find(d => d.day === activeDay) || festivalData[0],
        [festivalData, activeDay]
    );

    const navigate = (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handlePaymentSuccess = async (details: any) => {
        if (details.paymentType === 'pass') {
            await grantFestivalAllAccess();
        } else if (details.paymentType === 'block' && details.itemId) {
            await unlockFestivalBlock(details.itemId);
        }
        setPaymentItem(null);
    };

    const lobbyMovie = showLobbyFor
        ? (movies[showLobbyFor] || (() => {
            const block = festivalData.flatMap(d => d.blocks).find(b => b.id === showLobbyFor);
            if (!block) return null;
            return { key: block.id, title: block.title, isWatchPartyEnabled: true, isWatchPartyPaid: (block.price || 0) > 0, watchPartyPrice: block.price, poster: movies[block.movieKeys?.[0]]?.poster || '', director: 'Festival Event' } as Movie;
        })())
        : null;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const hasData = festivalData && festivalData.length > 0;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            <main className="max-w-4xl mx-auto px-4 pb-32 pt-8">

                {/* Header */}
                <div className="text-center py-12 md:py-20 mb-4">
                    <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/20 rounded-full px-4 py-1.5 mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Official Programme</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
                        {festivalConfig?.title || 'Crate Film Festival'}
                    </h1>

                    {festivalConfig?.subheader && (
                        <p className="text-red-500 font-black uppercase tracking-[0.4em] text-xs mb-6">{festivalConfig.subheader}</p>
                    )}

                    {festivalConfig?.description && (
                        <p className="text-gray-400 text-base max-w-2xl mx-auto leading-relaxed mb-8">
                            {festivalConfig.description}
                        </p>
                    )}

                    {festivalConfig?.startDate && (
                        <p className="text-gray-600 text-sm font-bold uppercase tracking-widest">
                            {festivalConfig.startDate}
                            {festivalConfig.endDate && festivalConfig.endDate !== festivalConfig.startDate && ` — ${festivalConfig.endDate}`}
                        </p>
                    )}

                    {/* All-access pass CTA */}
                    {!hasFestivalAllAccess && (
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setPaymentItem({ type: 'pass' })}
                                className="bg-white text-black font-black uppercase tracking-widest text-sm px-8 py-4 rounded-2xl hover:bg-gray-100 transition-all"
                            >
                                All-Access Pass · $50
                            </button>
                            <p className="text-xs text-gray-600">Or buy individual block tickets below</p>
                        </div>
                    )}
                    {hasFestivalAllAccess && (
                        <div className="mt-8 inline-flex items-center gap-2 bg-green-900/20 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            All-Access Pass Active
                        </div>
                    )}
                </div>

                {/* No data state */}
                {!hasData && (
                    <div className="text-center py-24 border border-dashed border-white/5 rounded-2xl">
                        <p className="text-gray-700 font-black uppercase tracking-widest text-xs">Full programme coming soon</p>
                        <p className="text-gray-600 text-sm mt-2">Check back closer to {festivalConfig?.startDate || 'the festival'}</p>
                    </div>
                )}

                {/* Day tabs */}
                {hasData && festivalData.length > 1 && (
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                        {festivalData.map(day => (
                            <button
                                key={day.day}
                                onClick={() => setActiveDay(day.day)}
                                className={`flex-shrink-0 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeDay === day.day ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white border border-white/5'}`}
                            >
                                Day {day.day}
                                {day.date && <span className="ml-2 font-normal normal-case tracking-normal opacity-70">{day.date}</span>}
                            </button>
                        ))}
                    </div>
                )}

                {/* Day header */}
                {hasData && currentDayData && (
                    <>
                        {festivalData.length > 1 && (
                            <div className="mb-8">
                                <h2 className="text-3xl font-black uppercase tracking-tight">Day {currentDayData.day}</h2>
                                {currentDayData.date && <p className="text-gray-500 text-sm mt-1">{currentDayData.date}</p>}
                            </div>
                        )}

                        {/* Blocks */}
                        <div className="space-y-6">
                            {currentDayData.blocks.map(block => {
                                const films = block.movieKeys.map(k => movies[k]).filter(Boolean) as Movie[];
                                const isUnlocked = hasFestivalAllAccess || unlockedFestivalBlockIds.has(block.id);
                                const isLive = activeParties[block.id]?.status === 'live';
                                const hasWatchParty = !!block.isWatchPartyEnabled;

                                return (
                                    <BlockSection
                                        key={block.id}
                                        block={block}
                                        films={films}
                                        dayLabel={`Day ${currentDayData.day}`}
                                        isUnlocked={isUnlocked}
                                        isLive={isLive}
                                        hasWatchParty={hasWatchParty}
                                        watchPartyPrice={block.price}
                                        onBuyTicket={() => setPaymentItem({ blockId: block.id, type: 'block' })}
                                        onEnterLobby={() => setShowLobbyFor(block.id)}
                                        onWatchFilm={key => navigate(`/movie/${key}?play=true`)}
                                    />
                                );
                            })}

                            {currentDayData.blocks.length === 0 && (
                                <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-gray-700 font-black uppercase tracking-widest text-xs">No blocks scheduled for this day yet</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Lobby overlay */}
            {showLobbyFor && lobbyMovie && (
                <div className="fixed inset-0 z-[200] overflow-y-auto">
                    <WatchPartyLobby
                        movie={lobbyMovie}
                        partyState={activeParties[showLobbyFor]}
                        onPartyStart={() => {
                            setShowLobbyFor(null);
                            navigate(`/watchparty/${showLobbyFor}`);
                        }}
                        user={user}
                        hasAccess={hasFestivalAllAccess || unlockedFestivalBlockIds.has(showLobbyFor) || unlockedWatchPartyKeys.has(showLobbyFor)}
                        onBuyTicket={() => setPaymentItem({ blockId: showLobbyFor, type: 'watchPartyTicket' })}
                        onClose={() => setShowLobbyFor(null)}
                    />
                </div>
            )}

            {/* Payment modal */}
            {paymentItem && (
                <SquarePaymentModal
                    paymentType={paymentItem.type as any}
                    block={paymentItem.blockId ? festivalData.flatMap(d => d.blocks).find(b => b.id === paymentItem.blockId) : undefined}
                    priceOverride={paymentItem.type === 'pass' ? 50 : (paymentItem.blockId ? festivalData.flatMap(d => d.blocks).find(b => b.id === paymentItem.blockId)?.price : undefined)}
                    onClose={() => setPaymentItem(null)}
                    onPaymentSuccess={handlePaymentSuccess as any}
                />
            )}

            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default FestivalProgramPage;
