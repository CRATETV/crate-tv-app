import React, { useState, useEffect } from 'react';
import { Movie } from '../types';
import { zineImg } from './zine/ZineArticleBody';

interface UnpackCountdownProps {
    movie: Movie;
    onExplore: () => void;
    onRemindMe: () => void;
}

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; isOver: boolean; }

const calculateTimeLeft = (target: Date): TimeLeft => {
    const difference = +target - +new Date();
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isOver: false,
    };
};

const pad = (n: number) => n.toString().padStart(2, '0');
const GOLD = '#c9a45c';
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

// The premiere band: a slim, black "marquee" with gold lines. One poster, the
// date, a ticking countdown. Renders nothing once the date has passed.
const UnpackCountdown: React.FC<UnpackCountdownProps> = ({ movie, onExplore, onRemindMe }) => {
    const [target] = useState(() => new Date(movie.releaseDateTime!));
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(target));

    useEffect(() => {
        if (timeLeft.isOver) return;
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft(target)), 1000);
        return () => clearInterval(timer);
    }, [target, timeLeft.isOver]);

    if (timeLeft.isOver) return null;

    const units = [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds },
    ];
    const when = target.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    return (
        <section aria-label="Next premiere" className="bg-[#0b0b0b] text-white" style={{ borderTop: `1px solid ${GOLD}`, borderBottom: `1px solid ${GOLD}` }}>
            <div className="max-w-[1300px] mx-auto px-6 md:px-12 py-6 md:py-7 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                <img src={zineImg(movie.poster, 300)} alt="" className="hidden md:block w-[72px] aspect-[2/3] object-cover flex-shrink-0" style={{ outline: `1px solid ${GOLD}`, outlineOffset: 3 }} />
                <div className="flex-grow min-w-0 text-center md:text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: GOLD }}>Premiere night</p>
                    <h2 style={{ fontFamily: SERIF }} className="text-2xl md:text-3xl font-bold italic leading-tight mt-1 truncate">{movie.title}</h2>
                    <p className="text-sm text-zinc-400 mt-1">{when}</p>
                </div>
                <div className="flex items-center gap-4 md:gap-5" aria-label="Time until the premiere">
                    {units.map((u, i) => (
                        <React.Fragment key={u.label}>
                            {i > 0 && <span className="w-px h-8 bg-white/15" aria-hidden />}
                            <div className="text-center min-w-[44px]">
                                <div style={{ fontFamily: SERIF }} className="text-3xl md:text-4xl font-bold tabular-nums leading-none">{pad(u.value)}</div>
                                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mt-1.5">{u.label}</div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={onRemindMe} className="text-[10px] font-black uppercase tracking-[0.25em] px-5 py-3 text-zinc-300 hover:text-white border border-white/20 hover:border-white/50 transition-colors">Remind me</button>
                    <button onClick={onExplore} className="text-[10px] font-black uppercase tracking-[0.25em] px-5 py-3 text-black transition-colors hover:bg-white" style={{ backgroundColor: GOLD }}>Explore</button>
                </div>
            </div>
        </section>
    );
};

export default UnpackCountdown;
