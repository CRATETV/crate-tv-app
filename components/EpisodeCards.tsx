import React, { useEffect, useRef } from 'react';

// A row of episode cards (Oct 2026): big number, title, length, a few lines of
// description, "Now playing" / "Up next". Scrolls sideways (swipe, arrows, or
// Tab + Enter), and keeps the current episode in view. Used in the player's
// Episodes tray on MoviePage.

interface EpisodeLike { id: string; title: string; synopsis?: string; duration?: number }

const EpisodeCards: React.FC<{
    episodes: EpisodeLike[];
    currentIndex: number;
    nextIndex?: number | null;
    onSelect: (index: number) => void;
}> = ({ episodes, currentIndex, nextIndex, onSelect }) => {
    const railRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Bring the playing episode into view when the row opens or the episode changes.
    useEffect(() => {
        const rail = railRef.current;
        const card = cardRefs.current[Math.max(0, currentIndex)];
        if (!rail || !card) return;
        rail.scrollTo({ left: Math.max(0, card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2), behavior: 'smooth' });
    }, [currentIndex]);

    const scrollBy = (dir: 1 | -1) => railRef.current?.scrollBy({ left: dir * Math.round((railRef.current?.clientWidth || 600) * 0.8), behavior: 'smooth' });

    return (
        <div className="relative">
            <button
                onClick={() => scrollBy(-1)}
                aria-label="Show earlier episodes"
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white text-xl hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >‹</button>
            <div
                ref={railRef}
                role="list"
                aria-label="Episodes"
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 md:px-14 scroll-pl-1 md:scroll-pl-14 py-2 scroll-smooth [scrollbar-width:thin]"
            >
                {episodes.map((ep, i) => {
                    const isNow = i === currentIndex;
                    const isNext = i === nextIndex;
                    return (
                        <button
                            key={ep.id || i}
                            ref={el => { cardRefs.current[i] = el; }}
                            role="listitem"
                            onClick={() => onSelect(i)}
                            aria-current={isNow ? 'true' : undefined}
                            aria-label={`Episode ${i + 1}: ${ep.title}${isNow ? ', now playing' : isNext ? ', up next' : ''}`}
                            className={`snap-start flex-shrink-0 w-56 md:w-64 min-h-[11rem] text-left rounded-2xl p-4 border transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isNow ? 'bg-red-600/25 border-red-500' : 'bg-white/10 border-white/15 hover:bg-white/20'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className={`text-4xl font-black leading-none ${isNow ? 'text-white' : 'text-white/60'}`}>{i + 1}</span>
                                <span className="text-xs font-bold text-white/70 pt-1">{ep.duration ? `${ep.duration} min` : ''}</span>
                            </div>
                            <p className="mt-3 text-base font-bold text-white leading-snug line-clamp-2">{ep.title}</p>
                            {ep.synopsis && <p className="mt-1 text-sm text-white/70 leading-snug line-clamp-3">{ep.synopsis}</p>}
                            {(isNow || isNext) && (
                                <span className={`inline-block mt-3 text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded ${isNow ? 'bg-red-600 text-white' : 'bg-white text-black'}`}>
                                    {isNow ? 'Now playing' : 'Up next'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => scrollBy(1)}
                aria-label="Show later episodes"
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/80 border border-white/20 text-white text-xl hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >›</button>
        </div>
    );
};

export default EpisodeCards;
