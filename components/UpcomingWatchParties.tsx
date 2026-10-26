import React, { useEffect, useMemo, useState } from 'react';
import { Movie, FestivalDay, FilmBlock, WatchPartyState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { isOutsidePartner } from '../api/_lib/partnerRules';
import { PWYW_MIN_DOLLARS } from '../api/_lib/paymentRules';

// "Upcoming watch parties" on the home page.
//
// Before this, a scheduled watch party only really showed up once it went
// live (or as a small, dismissable ribbon), so people found out at start
// time and missed the beginning. Now every party in the next 30 days is on
// the home page with a live countdown, its price and a ticket button. Buying
// early means that at start time they go straight into the film.

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;   // show parties up to 30 days ahead
const GRACE_MS = 3 * 60 * 60 * 1000;          // keep a just-started party visible

interface Item {
    key: string;
    title: string;
    startMs: number;
    poster: string;
    priceLabel: string;
    isFree: boolean;
    isBlock: boolean;
    partnerId?: string;
}

const tz = 'America/New_York';
const whenLabel = (ms: number) => new Date(ms).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short',
});

function countdown(ms: number): string {
    if (ms <= 0) return 'Starting now';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${String(sec).padStart(2, '0')}s`;
    return `${m}m ${String(sec).padStart(2, '0')}s`;
}

const UpcomingWatchParties: React.FC<{
    movies: Record<string, Movie>;
    festivalData: FestivalDay[];
    allPartyStates: Record<string, WatchPartyState>;
    className?: string;
}> = ({ movies, festivalData, allPartyStates, className = 'px-2' }) => {
    const { hasFestivalAllAccess, unlockedFestivalBlockIds, unlockedWatchPartyKeys, rentals } = useAuth();
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    // Recompute the list once a minute (the countdown text ticks every second).
    const minute = Math.floor(now / 60000);

    const items = useMemo(() => {
        const t = minute * 60000;
        const inWindow = (startMs: number, key: string) => {
            if (!Number.isFinite(startMs)) return false;
            if (allPartyStates[key]?.status === 'ended') return false;
            return startMs > t - GRACE_MS && startMs < t + WINDOW_MS;
        };
        const out: Item[] = [];
        for (const m of Object.values(movies)) {
            if (!m || !m.isWatchPartyEnabled || m.isUnlisted || !m.watchPartyStartTime) continue;
            const startMs = Date.parse(m.watchPartyStartTime);
            if (!inWindow(startMs, m.key)) continue;
            const paid = m.isWatchPartyPaid === true;
            out.push({
                key: m.key, title: m.title, startMs, poster: m.poster || m.tvPoster || '', isBlock: false,
                isFree: !paid,
                priceLabel: !paid ? 'Free' : m.watchPartyPayWhatYouWant ? `Pay what you want ($${PWYW_MIN_DOLLARS}+)` : `$${(m.watchPartyPrice ?? 5).toFixed(2)}`,
            });
        }
        for (const day of festivalData || []) {
            for (const b of (day.blocks || []) as FilmBlock[]) {
                if (b.isWatchPartyEnabled === false) continue;
                const startMs = Date.parse(String(b.screeningStartTime || b.watchPartyStartTime || ''));
                if (!inWindow(startMs, b.id)) continue;
                const price = typeof b.price === 'number' ? b.price : 10;
                out.push({
                    key: b.id, title: b.title, startMs, poster: movies[b.movieKeys?.[0]]?.poster || '', isBlock: true,
                    partnerId: b.partnerId || (day as any).partnerId,
                    isFree: price === 0, priceLabel: price === 0 ? 'Free' : `$${price.toFixed(2)}`,
                });
            }
        }
        return out.sort((a, b) => a.startMs - b.startMs).slice(0, 8);
    }, [movies, festivalData, allPartyStates, minute]);

    if (!items.length) return null;

    const hasTicket = (it: Item) => {
        if (it.isFree) return false;
        if (unlockedWatchPartyKeys.has(it.key)) return true;
        if (it.isBlock) {
            if (unlockedFestivalBlockIds.has(it.key)) return true;
            return hasFestivalAllAccess && !isOutsidePartner(it.partnerId);
        }
        const rent = rentals?.[it.key];
        return !!rent && Date.parse(rent) > now;
    };

    const open = (key: string) => {
        window.history.pushState({}, '', `/watchparty/${key}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <section aria-label="Upcoming watch parties" className={className}>
            <div className="flex items-end justify-between mb-4 border-l-4 border-red-600 pl-4">
                <div>
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-white">Upcoming watch parties</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">Get your ticket early. When the countdown hits zero, the film starts for everyone.</p>
                </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none]">
                {items.map(it => {
                    const left = it.startMs - now;
                    const live = allPartyStates[it.key]?.status === 'live' || left <= 0;
                    const ticket = hasTicket(it);
                    const cta = live
                        ? (ticket || it.isFree ? 'Join now' : 'Get ticket & join')
                        : ticket ? "You're in ✓" : it.isFree ? 'Save my seat' : 'Get ticket';
                    return (
                        <button key={it.key} onClick={() => open(it.key)}
                            className="snap-start shrink-0 w-[78vw] sm:w-[340px] text-left rounded-2xl overflow-hidden border border-white/10 bg-[#121216] hover:border-white/30 transition-all group">
                            <div className="relative aspect-video bg-black">
                                {it.poster && <img src={it.poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" loading="lazy" />}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                <div className="absolute top-3 left-3">
                                    {live ? (
                                        <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live now
                                        </span>
                                    ) : (
                                        <span className="bg-black/70 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                                            Starts in {countdown(left)}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute bottom-3 left-4 right-4">
                                    <p className="text-white font-black text-lg leading-tight line-clamp-2">{it.title}</p>
                                    <p className="text-gray-300 text-xs mt-1">{whenLabel(it.startMs)}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                                <span className="text-xs font-bold text-gray-300 truncate">{it.priceLabel}</span>
                                <span className={`shrink-0 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg ${ticket && !live ? 'bg-green-600/20 text-green-400' : 'bg-red-600 text-white'}`}>{cta}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default UpcomingWatchParties;
