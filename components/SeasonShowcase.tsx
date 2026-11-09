import React from 'react';
import { Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useAuth } from '../contexts/AuthContext';
import { Season, SeasonTheme, daysLeft } from '../api/_lib/seasons';

// A seasonal collection (Cratemas, Valentine's…) dressed for the season. Built to look full and
// intentional with only one to three films: one film gets a feature layout, two or three get big
// cards plus a "more joining soon" card, four or more become a normal grid.

interface Look { bg: string; glow: string; accent: string; accent2: string; text: string; icon: string; soon: string }
const LOOKS: Record<SeasonTheme, Look> = {
    christmas:    { bg: 'linear-gradient(180deg,#0b3d2b 0%,#06241a 55%,#050f0b 100%)', glow: 'rgba(200,16,46,0.28)', accent: '#E0233F', accent2: '#E8C766', text: '#fff', icon: '🎄', soon: 'More holiday films are being wrapped up' },
    valentines:   { bg: 'linear-gradient(180deg,#5a0f2a 0%,#2b0816 60%,#12040a 100%)', glow: 'rgba(251,113,133,0.30)', accent: '#FB7185', accent2: '#FBD5DC', text: '#fff', icon: '❤️', soon: 'More love stories are on the way' },
    halloween:    { bg: 'linear-gradient(180deg,#2a1140 0%,#150a22 60%,#0a0610 100%)', glow: 'rgba(249,115,22,0.28)', accent: '#F97316', accent2: '#C4B5FD', text: '#fff', icon: '🎃', soon: 'More scares are creeping in' },
    blackhistory: { bg: 'linear-gradient(180deg,#1a1410 0%,#0d0b09 100%)', glow: 'rgba(212,160,23,0.22)', accent: '#D4A017', accent2: '#E5304F', text: '#fff', icon: '✊🏾', soon: 'More films are joining the lineup' },
    gold:         { bg: 'linear-gradient(180deg,#1c1917 0%,#0a0a0a 100%)', glow: 'rgba(201,164,92,0.25)', accent: '#C9A45C', accent2: '#F5E7C1', text: '#fff', icon: '✨', soon: 'More films are joining the lineup' },
    generic:      { bg: 'linear-gradient(180deg,#17171c 0%,#0a0a0c 100%)', glow: 'rgba(255,255,255,0.10)', accent: '#E5304F', accent2: '#D1D1D6', text: '#fff', icon: '🎬', soon: 'More films are joining the lineup' },
};

const Bow: React.FC<{ color: string; knot?: string; size?: number }> = ({ color, knot = color, size = 84 }) => (
    <svg width={size} height={size * 0.62} viewBox="0 0 120 74" aria-hidden="true" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.45))' }}>
        <path d="M60 38 C40 4 6 2 8 30 C10 52 40 48 60 38Z" fill={color} />
        <path d="M60 38 C80 4 114 2 112 30 C110 52 80 48 60 38Z" fill={color} />
        <path d="M60 38 C44 18 22 14 20 28 C20 40 42 42 60 38Z" fill="rgba(0,0,0,.18)" />
        <path d="M60 38 C76 18 98 14 100 28 C100 40 78 42 60 38Z" fill="rgba(0,0,0,.18)" />
        <path d="M52 44 L34 72 L50 66 L58 50Z" fill={color} />
        <path d="M68 44 L86 72 L70 66 L62 50Z" fill={color} />
        <rect x="50" y="28" width="20" height="22" rx="7" fill={knot} />
        <rect x="53" y="31" width="5" height="16" rx="2.5" fill="rgba(255,255,255,.28)" />
    </svg>
);

const LightString: React.FC<{ colors: string[] }> = ({ colors }) => {
    const n = 22;
    return (
        <svg viewBox="0 0 1100 60" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-12 md:h-14 pointer-events-none" aria-hidden="true">
            <path d="M0 8 Q 55 44 110 8 T 220 8 T 330 8 T 440 8 T 550 8 T 660 8 T 770 8 T 880 8 T 990 8 T 1100 8" fill="none" stroke="rgba(0,0,0,.55)" strokeWidth="2" />
            {Array.from({ length: n }).map((_, i) => {
                const x = 25 + i * 50, y = i % 2 ? 36 : 30, c = colors[i % colors.length];
                return <g key={i} className="season-bulb" style={{ animationDelay: `${(i % 5) * 0.4}s` }}>
                    <circle cx={x} cy={y + 4} r="14" fill={c} opacity=".22" />
                    <rect x={x - 3} y={y - 8} width="6" height="7" fill="#222" />
                    <ellipse cx={x} cy={y + 5} rx="5.5" ry="8" fill={c} />
                </g>;
            })}
        </svg>
    );
};

const Falling: React.FC<{ glyph: string; count?: number }> = ({ glyph, count = 16 }) => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="season-fall absolute" style={{ left: `${(i * 97) % 100}%`, fontSize: 10 + (i % 4) * 5, opacity: 0.35 + (i % 3) * 0.15, animationDuration: `${9 + (i % 6) * 2}s`, animationDelay: `${-(i % 9) * 1.7}s` }}>{glyph}</span>
        ))}
    </div>
);

const Border: React.FC<{ theme: SeasonTheme; look: Look }> = ({ theme, look }) => theme === 'blackhistory'
    ? <div className="absolute top-0 left-0 right-0 flex h-2" aria-hidden="true">{['#E5304F', '#D4A017', '#1FA35B'].map(c => <div key={c} className="flex-1" style={{ background: c }} />)}</div>
    : <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${look.accent2},transparent)` }} aria-hidden="true" />;

const Corner: React.FC<{ theme: SeasonTheme; look: Look }> = ({ theme, look }) => {
    if (theme === 'christmas') return <div className="absolute -top-3 -left-3 z-10 -rotate-12"><Bow color={look.accent} knot="#B01A32" size={64} /></div>;
    if (theme === 'valentines') return <div className="absolute -top-3 -left-2 z-10 text-3xl drop-shadow-lg" aria-hidden>❤️</div>;
    if (theme === 'halloween') return <div className="absolute -top-3 -left-2 z-10 text-3xl drop-shadow-lg" aria-hidden>🦇</div>;
    return null;
};

const poster = (m: Movie) => `/api/proxy-image?url=${encodeURIComponent(m.poster)}&w=600`;
const snip = (t: string, n: number) => { const s = (t || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };

interface Props { season: Season; movies: Movie[]; onSelect: (m: Movie) => void; variant?: 'home' | 'page'; now?: Date }

const SeasonShowcase: React.FC<Props> = ({ season, movies, onSelect, variant = 'home', now = new Date() }) => {
    const { watchlist, toggleWatchlist, likedMovies, toggleLikeMovie, watchedMovies } = useAuth();
    const look = LOOKS[season.theme] || LOOKS.generic;
    const left = season.mode === 'auto' ? daysLeft(now, season.start, season.end) : 0;
    const page = variant === 'page';
    const few = movies.length > 0 && movies.length <= 3;

    return (
        <section className={`relative overflow-hidden rounded-3xl my-8 md:my-12 ${page ? 'mx-0' : ''}`} style={{ background: look.bg, color: look.text }} aria-label={season.name}>
            <style>{`
                @keyframes seasonFall{0%{transform:translateY(-10%) rotate(0)}100%{transform:translateY(120vh) rotate(180deg)}}
                @keyframes seasonBulb{0%,100%{opacity:1}50%{opacity:.55}}
                .season-fall{top:-5%;animation:seasonFall linear infinite}
                .season-bulb{animation:seasonBulb 2.4s ease-in-out infinite}
                @media (prefers-reduced-motion:reduce){.season-fall,.season-bulb{animation:none}}
            `}</style>
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${look.glow}, transparent 65%)` }} />
            <Border theme={season.theme} look={look} />
            {season.theme === 'christmas' && <><LightString colors={['#E0233F', '#E8C766', '#2FBF71', '#FFFFFF']} /><Falling glyph="❄" /></>}
            {season.theme === 'valentines' && <Falling glyph="♥" count={12} />}
            {season.theme === 'halloween' && <Falling glyph="🦇" count={8} />}

            <div className={`relative z-10 text-center px-5 md:px-12 ${page ? 'pt-24 pb-14' : 'pt-20 pb-10'}`}>
                {season.theme === 'christmas' && <div className="flex justify-center mb-2"><Bow color={look.accent} knot="#B01A32" size={page ? 110 : 90} /></div>}
                {season.theme !== 'christmas' && <div className="text-4xl mb-2" aria-hidden>{look.icon}</div>}
                <h2 className={`font-black tracking-tight ${page ? 'text-5xl md:text-7xl' : 'text-3xl md:text-5xl'}`} style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: look.accent2, textShadow: `0 0 28px ${look.glow}` }}>{season.name}</h2>
                {season.tagline && <p className="mt-3 max-w-2xl mx-auto text-base md:text-lg text-white/80">{season.tagline}</p>}
                {left > 0 && <p className="mt-4 inline-block rounded-full border px-4 py-1 text-xs font-bold tracking-widest uppercase" style={{ borderColor: look.accent, color: look.accent2 }}>{left === 1 ? 'Last day' : `${left} days left`}</p>}
            </div>

            <div className="relative z-10 px-5 md:px-12 pb-12">
                {movies.length === 0 && <p className="text-center text-white/70 py-6">{look.soon}. Check back soon.</p>}

                {movies.length === 1 && (
                    <button onClick={() => onSelect(movies[0])} className="group relative mx-auto flex max-w-3xl flex-col md:flex-row items-center gap-6 md:gap-10 text-left rounded-2xl p-5 md:p-8 border border-white/10 bg-black/30 hover:bg-black/40 transition">
                        <div className="relative shrink-0 w-48 md:w-56"><Corner theme={season.theme} look={look} /><img src={poster(movies[0])} alt={movies[0].title} className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl" crossOrigin="anonymous" /></div>
                        <div className="min-w-0 text-center md:text-left">
                            <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: look.accent2 }}>Featured this season</p>
                            <h3 className="mt-2 text-2xl md:text-4xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{movies[0].title}</h3>
                            {movies[0].director && <p className="mt-1 text-sm text-white/60">Directed by {movies[0].director}</p>}
                            <p className="mt-3 text-white/80 text-sm md:text-base">{snip(movies[0].synopsis, 220)}</p>
                            <span className="mt-5 inline-flex items-center rounded-full px-6 py-3 font-black text-sm text-black group-hover:brightness-110" style={{ background: look.accent2 }}>▶ Watch now</span>
                        </div>
                    </button>
                )}
                {movies.length === 1 && <p className="text-center text-sm text-white/55 mt-5">{look.soon}.</p>}

                {(movies.length === 2 || movies.length === 3) && (
                    <div className={`mx-auto grid gap-5 md:gap-8 ${movies.length === 2 ? 'max-w-3xl grid-cols-2' : 'max-w-5xl grid-cols-2 md:grid-cols-4'}`}>
                        {movies.map(m => (
                            <button key={m.key} onClick={() => onSelect(m)} className="group relative text-left rounded-2xl p-3 border border-white/10 bg-black/30 hover:bg-black/45 transition">
                                <Corner theme={season.theme} look={look} />
                                <img src={poster(m)} alt={m.title} className="w-full aspect-[2/3] object-cover rounded-xl shadow-xl group-hover:scale-[1.02] transition-transform" crossOrigin="anonymous" />
                                <h3 className="mt-3 font-bold leading-tight">{m.title}</h3>
                                {m.director && <p className="text-xs text-white/55 mt-0.5">{m.director}</p>}
                            </button>
                        ))}
                        <div className="hidden md:flex flex-col items-center justify-center text-center rounded-2xl border border-dashed p-4 text-sm text-white/65" style={{ borderColor: `${look.accent}88`, display: movies.length === 3 ? undefined : 'none' }}>
                            <span className="text-3xl mb-2" aria-hidden>{look.icon}</span>{look.soon}
                        </div>
                    </div>
                )}

                {movies.length >= 4 && (
                    <div className="mx-auto max-w-7xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {movies.map(m => (
                            <div key={m.key} className="relative"><Corner theme={season.theme} look={look} />
                                <MovieCard movie={m} onSelectMovie={onSelect} isOnWatchlist={watchlist.includes(m.key)} onToggleWatchlist={toggleWatchlist}
                                    isLiked={likedMovies.includes(m.key)} onToggleLike={toggleLikeMovie} isWatched={watchedMovies.includes(m.key)} />
                            </div>
                        ))}
                    </div>
                )}

                {!page && movies.length > 0 && (
                    <div className="text-center mt-8"><a href="/cratemas" className="text-sm font-bold underline underline-offset-4" style={{ color: look.accent2 }}>See the whole collection →</a></div>
                )}
            </div>
        </section>
    );
};
export default SeasonShowcase;
