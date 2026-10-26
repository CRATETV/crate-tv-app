import React, { useMemo, useState } from 'react';
import HostWithCrateCta from './HostWithCrateCta';
import { useFestival } from '../contexts/FestivalContext';
import { useAuth } from '../contexts/AuthContext';
import { FilmBlock, Movie, FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS } from '../types';
import Header from './Header';
import BottomNavBar from './BottomNavBar';
import FestivalTicketFlow from './FestivalTicketFlow';
import SquarePaymentModal from './SquarePaymentModal';
import { partnerPassItemId } from '../api/_lib/partnerRules';
import { formatWhen, money } from '../services/partnerApi';
import AudienceChoiceVote from './AudienceChoiceVote';

// ─────────────────────────────────────────────────────────────────────────────
// FESTIVAL IN A BOX — a partner festival's public, branded page
// (/festivals/:slug). Tickets, watch parties, reminders and rewatch all use
// the same machinery as PWFF; only the branding and the lineup differ.
// ─────────────────────────────────────────────────────────────────────────────

const navigate = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new Event('pushstate')); };

const PartnerFestivalPage: React.FC<{ slug: string }> = ({ slug }) => {
    const { partnerFestivals, festivalData, movies, allPartyStates, isLoading } = useFestival();
    const { user, unlockedFestivalBlockIds, unlockedWatchPartyKeys } = useAuth();
    const fest = partnerFestivals[slug];
    const [activeDay, setActiveDay] = useState<number | null>(null);
    const [ticketBlock, setTicketBlock] = useState<FilmBlock | null>(null);
    const [buyingPass, setBuyingPass] = useState(false);
    const [voteBlockId, setVoteBlockId] = useState<string | null>(null);

    const days = useMemo(() => fest
        ? festivalData.filter(d => d.partnerId === fest.partnerId).sort((a, b) => a.day - b.day)
        : [], [festivalData, fest]);

    const isExpired = (b: FilmBlock) => {
        const ref = b.festivalEndTime || b.screeningStartTime;
        const t = ref ? new Date(ref).getTime() : NaN;
        return !Number.isNaN(t) && Date.now() - t > FESTIVAL_BLOCK_VISIBILITY_WINDOW_MS;
    };
    const visibleDays = days.map(d => ({ ...d, blocks: (d.blocks || []).filter(b => !isExpired(b)) })).filter(d => d.blocks.length > 0);
    const currentDay = visibleDays.find(d => d.day === activeDay) || visibleDays[0];
    const allBlocks = days.flatMap(d => d.blocks || []);
    const hasPass = allBlocks.length > 0 && allBlocks.every(b => unlockedFestivalBlockIds.has(b.id));

    if (isLoading && !fest) {
        return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /></div>;
    }
    if (!fest) {
        return (
            <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-3">Festival not found</p>
                <h1 className="text-2xl font-black mb-6">This festival isn't on Crate TV (yet).</h1>
                <button onClick={() => navigate('/')} className="bg-white text-black font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-xl">Go to Crate TV</button>
            </div>
        );
    }

    const d = fest.details;
    const accent = /^#[0-9a-fA-F]{6}$/.test(d.accentColor) ? d.accentColor : '#e11d48';
    const passPrice = d.passPrice && d.passPrice > 0 ? d.passPrice : 0;
    const dateRange = [d.startDate, d.endDate].filter(Boolean)
        .map(s => new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
        .join(' – ');

    const blockMovie = (b: FilmBlock): Movie => {
        const first = movies[b.movieKeys?.[0]];
        return {
            key: b.id, title: b.title, isWatchPartyEnabled: true, isWatchPartyPaid: (b.price || 0) > 0, watchPartyPrice: b.price,
            poster: first?.poster || d.heroImageUrl || '', director: d.title, synopsis: '', cast: [], trailer: '', fullMovie: '',
            tvPoster: first?.poster || '', likes: 0, watchPartyStartTime: b.screeningStartTime || b.watchPartyStartTime,
        } as Movie;
    };

    const requireLogin = () => navigate(`/login?redirect=${encodeURIComponent(`/festivals/${slug}`)}`);

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />

            {/* Hero */}
            <section className="relative pt-24 overflow-hidden">
                {d.heroImageUrl && <img src={d.heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#050505]/70 to-[#050505]" />
                <div className="relative max-w-5xl mx-auto px-4 py-14 md:py-20">
                    {d.logoUrl && <img src={d.logoUrl} alt={d.title} className="h-16 md:h-20 w-auto mb-6 object-contain" />}
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-3" style={{ color: accent }}>{dateRange || 'Online festival'} · Streaming on Crate TV</p>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95]">{d.title}</h1>
                    {d.tagline && <p className="text-lg md:text-xl text-gray-300 mt-4 max-w-2xl">{d.tagline}</p>}
                    {d.description && <p className="text-sm text-gray-400 mt-5 max-w-2xl whitespace-pre-line">{d.description}</p>}
                    <div className="flex gap-3 mt-8 flex-wrap">
                        {passPrice > 0 && !hasPass && (
                            <button onClick={() => (user ? setBuyingPass(true) : requireLogin())}
                                className="text-white font-black text-[11px] uppercase tracking-widest px-6 py-3.5 rounded-xl active:scale-95 transition-transform"
                                style={{ backgroundColor: accent }}>
                                Festival pass — {money(passPrice)}
                            </button>
                        )}
                        {hasPass && <span className="inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-black uppercase tracking-widest px-5 py-3 rounded-xl">✓ You have a festival pass</span>}
                        {d.websiteUrl && <a href={d.websiteUrl} target="_blank" rel="noopener noreferrer" className="bg-white/5 border border-white/15 text-white font-black text-[11px] uppercase tracking-widest px-6 py-3.5 rounded-xl">Festival website</a>}
                    </div>
                </div>
            </section>

            {/* Schedule */}
            <main className="max-w-5xl mx-auto px-4 pb-32">
                {visibleDays.length === 0 && <p className="text-gray-400 py-10">The schedule will appear here soon.</p>}
                {visibleDays.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
                        {visibleDays.map(day => (
                            <button key={day.day} onClick={() => setActiveDay(day.day)}
                                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${currentDay?.day === day.day ? 'text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                style={currentDay?.day === day.day ? { backgroundColor: accent, borderColor: accent } : undefined}>
                                {day.date || `Day ${day.day}`}
                            </button>
                        ))}
                    </div>
                )}
                <div className="space-y-5">
                    {[...(currentDay?.blocks || [])]
                        .sort((a, b) => (Date.parse(a.screeningStartTime || '') || 0) - (Date.parse(b.screeningStartTime || '') || 0))
                        .map(block => {
                            const status = allPartyStates[block.id]?.status;
                            const isLive = status === 'live';
                            const isEnded = status === 'ended';
                            const isUnlocked = unlockedFestivalBlockIds.has(block.id) || unlockedWatchPartyKeys.has(block.id);
                            const isFree = !block.price || block.price <= 0;
                            const soldOut = !isUnlocked && !!block.capacity && (block.ticketsSold || 0) >= block.capacity;
                            const films = (block.movieKeys || []).map(k => movies[k]).filter(Boolean) as Movie[];
                            const totalMin = films.reduce((s, f) => s + (f.durationInMinutes || 0), 0);
                            const join = () => (isUnlocked || isFree ? navigate(`/watchparty/${block.id}`) : setTicketBlock(block));
                            return (
                                <article key={block.id} className="rounded-2xl border bg-white/[0.02] overflow-hidden" style={{ borderColor: isLive ? accent : 'rgba(255,255,255,0.08)' }}>
                                    <div className="p-5 md:p-7 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div>
                                            {isLive && <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-2 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: `${accent}26`, color: accent }}><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />Live now</span>}
                                            {isEnded && <span className="inline-flex rounded-full px-3 py-1 mb-2 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">Screening ended · watch on demand</span>}
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{formatWhen(block.screeningStartTime || '')}{totalMin > 0 ? ` · ${Math.floor(totalMin / 60) ? `${Math.floor(totalMin / 60)}h ` : ''}${totalMin % 60}m` : ''}</p>
                                            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight mt-1">{block.title}</h2>
                                            <p className="text-xs text-gray-500 mt-1">{films.length} film{films.length === 1 ? '' : 's'}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {isEnded ? ((isUnlocked || isFree) && films.length >= 2
                                                    ? <button onClick={() => setVoteBlockId(block.id)} className="bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">🏆 Vote Audience Choice</button>
                                                    : null)
                                                : soldOut ? <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Sold out</span>
                                                : isLive ? <button onClick={join} className="text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl" style={{ backgroundColor: accent }}>Join watch party</button>
                                                : isUnlocked || isFree ? <button onClick={() => navigate(`/watchparty/${block.id}`)} className="bg-white text-black font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl">{isFree && !isUnlocked ? 'Free · Enter lobby' : 'Enter lobby'}</button>
                                                : <button onClick={() => setTicketBlock(block)} className="bg-white text-black font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl">Get ticket — {money(block.price)}</button>}
                                        </div>
                                    </div>
                                    <div className="border-t border-white/5 divide-y divide-white/5">
                                        {films.map(f => (
                                            <div key={f.key} className="flex items-center gap-4 px-5 md:px-7 py-3">
                                                <div className="w-10 h-14 rounded-md bg-white/5 overflow-hidden flex-shrink-0">{f.poster && <img src={f.poster} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-white truncate">{f.title}</p>
                                                    <p className="text-xs text-gray-500 truncate">{f.director}{f.durationInMinutes ? ` · ${f.durationInMinutes} min` : ''}</p>
                                                </div>
                                                {isEnded && <button onClick={() => navigate(`/movie/${f.key}`)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/15 hover:bg-white/10">{isUnlocked ? 'Watch' : 'Rent'}</button>}
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                </div>
                <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mt-16">Presented by {fest.name} · Streaming on Crate TV</p>
                <HostWithCrateCta className="mt-8 max-w-2xl mx-auto" />
            </main>

            {voteBlockId && (
                <div className="fixed inset-0 z-[650] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setVoteBlockId(null)}>
                    <div className="w-full max-w-xl relative" onClick={e => e.stopPropagation()}>
                        <button type="button" className="absolute -top-9 right-0 text-gray-300 hover:text-white text-sm" onClick={() => setVoteBlockId(null)}>Close ✕</button>
                        <AudienceChoiceVote blockId={voteBlockId} showClosedMessage />
                    </div>
                </div>
            )}
            {ticketBlock && (
                <FestivalTicketFlow block={ticketBlock} blockMovie={blockMovie(ticketBlock)} onClose={() => setTicketBlock(null)} onSuccess={() => setTicketBlock(null)} />
            )}
            {buyingPass && (
                <SquarePaymentModal
                    paymentType="block"
                    block={{ id: partnerPassItemId(fest.partnerId), title: `${d.title} — Festival Pass`, time: '', movieKeys: [], price: passPrice } as FilmBlock}
                    priceOverride={passPrice}
                    onClose={() => setBuyingPass(false)}
                    // The pass is granted on the server; reload so every block shows as unlocked.
                    onPaymentSuccess={() => { setTimeout(() => window.location.reload(), 1200); }}
                />
            )}
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export default PartnerFestivalPage;
