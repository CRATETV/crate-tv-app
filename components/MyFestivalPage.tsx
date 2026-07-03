import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import Header from './Header';
import Footer from './Footer';
import LoadingSpinner from './LoadingSpinner';

// New page: previously a ticket holder's only way to find "what did I buy /
// what's live right now / what's next" was to remember which blocks they
// got and re-find each one on the PWFF programme page individually. This
// pulls everything they actually have access to into one place, sorted by
// what matters most right now (live, then next up, then everything else).
const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
};

const formatTime = (d: Date | null): string | null => {
    if (!d || isNaN(d.getTime())) return null;
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const MyFestivalPage: React.FC = () => {
    const { user, hasFestivalAllAccess, unlockedFestivalBlockIds } = useAuth();
    const { festivalData, movies, allPartyStates, isLoading } = useFestival();

    const myBlocks = useMemo(() => {
        const allBlocks = festivalData.flatMap(day =>
            (day.blocks || []).map(block => ({ block, dayLabel: `Day ${day.day}` }))
        );
        const accessible = hasFestivalAllAccess
            ? allBlocks
            : allBlocks.filter(({ block }) => unlockedFestivalBlockIds.has(block.id));

        return accessible
            .map(({ block, dayLabel }) => {
                // `activeParties` only ever contains status==='live' docs, so an ended
                // party's doc simply isn't in it — reading status from there meant
                // `isEnded` could never actually be true. `allPartyStates` has every
                // status, so it's the reliable source here (same fix as the PWFF
                // programme page and the site-wide live banner).
                const partyState = allPartyStates[block.id];
                const isLive = partyState?.status === 'live';
                const isEnded = partyState?.status === 'ended';
                const startStr = block.screeningStartTime || (block as any).watchPartyStartTime;
                const start = startStr ? new Date(startStr) : null;
                const isUpcoming = !!start && !isNaN(start.getTime()) && new Date() < start && !isLive && !isEnded;
                const films = (block.movieKeys || []).map(k => movies[k]).filter(Boolean);
                return { block, dayLabel, isLive, isEnded, isUpcoming, start, films };
            })
            .sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));
    }, [festivalData, hasFestivalAllAccess, unlockedFestivalBlockIds, allPartyStates, movies]);

    const liveNow = myBlocks.filter(b => b.isLive);
    const upNext = myBlocks.find(b => b.isUpcoming);
    const rest = myBlocks.filter(b => b.block.id !== upNext?.block.id && !b.isLive);

    const goWatch = (block: typeof myBlocks[number]['block'], isEnded: boolean) => {
        if (isEnded) {
            const firstFilm = (block.movieKeys || [])[0];
            if (firstFilm) navigate(`/movie/${firstFilm}?play=true`);
            else navigate('/pwff');
        } else {
            navigate(`/watchparty/${block.id}`);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={true} />
            <main className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full">
                <div className="mb-12 text-center">
                    <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.4em] mb-3">My Festival</p>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic">
                        {hasFestivalAllAccess
                            ? 'All-Access Pass'
                            : myBlocks.length > 0
                                ? `${myBlocks.length} Screening${myBlocks.length !== 1 ? 's' : ''}`
                                : 'Welcome'}
                    </h1>
                    {user?.name && <p className="text-gray-500 text-sm mt-3">Signed in as {user.name}</p>}
                </div>

                {myBlocks.length === 0 && (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl space-y-6">
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">
                            You don't have any festival screenings unlocked yet. Grab a ticket to a block, or the All-Access Pass, to see it here.
                        </p>
                        <button
                            onClick={() => navigate('/pwff')}
                            className="bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            Browse The Festival
                        </button>
                    </div>
                )}

                {liveNow.length > 0 && (
                    <div className="mb-10 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Live Right Now
                        </p>
                        {liveNow.map(({ block, dayLabel }) => (
                            <div key={block.id} className="bg-red-600/10 border border-red-500/30 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">{dayLabel}</p>
                                    <h2 className="text-xl font-black uppercase text-white">{block.title}</h2>
                                </div>
                                <button
                                    onClick={() => goWatch(block, false)}
                                    className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl transition-all animate-pulse flex-shrink-0"
                                >
                                    Join Party
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {upNext && (
                    <div className="mb-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4">Up Next</p>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{upNext.dayLabel}</p>
                                <h2 className="text-xl font-black uppercase text-white">{upNext.block.title}</h2>
                                {formatTime(upNext.start) && (
                                    <p className="text-gray-400 text-sm mt-1">Starts {formatTime(upNext.start)}</p>
                                )}
                            </div>
                            <button
                                onClick={() => goWatch(upNext.block, false)}
                                className="bg-white hover:bg-gray-200 text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl transition-all flex-shrink-0"
                            >
                                Enter Lobby
                            </button>
                        </div>
                    </div>
                )}

                {rest.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-4">All My Screenings</p>
                        {rest.map(({ block, dayLabel, isEnded, start }) => (
                            <div key={block.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{dayLabel}</p>
                                    <h3 className="text-sm font-black uppercase text-white">{block.title}</h3>
                                    <p className="text-gray-500 text-xs mt-1">
                                        {isEnded ? 'Available on-demand' : formatTime(start) ? `Starts ${formatTime(start)}` : 'Schedule coming soon'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => goWatch(block, isEnded)}
                                    className="bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-xl transition-all flex-shrink-0"
                                >
                                    {isEnded ? 'Watch Now' : 'Enter Lobby'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default MyFestivalPage;
