import React, { useState, useEffect } from 'react';
import { Movie } from '../types';

interface UnpackCountdownProps {
    movie: Movie;
    onExplore: () => void;
    onRemindMe: () => void;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOver: boolean;
}

const calculateTimeLeft = (target: Date): TimeLeft => {
    const difference = +target - +new Date();
    if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
    }
    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isOver: false,
    };
};

const pad = (n: number) => n.toString().padStart(2, '0');

// "72 HOURS"-style countdown block — big block digits over a backdrop image,
// modeled on Tudum's premiere countdown hero. Renders nothing once the
// target date has passed so it never shows a stale/expired countdown.
const UnpackCountdown: React.FC<UnpackCountdownProps> = ({ movie, onExplore, onRemindMe }) => {
    const [target] = useState(() => new Date(movie.releaseDateTime!));
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(target));

    useEffect(() => {
        if (timeLeft.isOver) return;
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft(target));
        }, 1000);
        return () => clearInterval(timer);
    }, [target, timeLeft.isOver]);

    if (timeLeft.isOver) return null;

    const units: { label: string; value: number }[] = [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds },
    ];

    return (
        <div className="group relative overflow-hidden rounded-[3rem] shadow-xl min-h-[420px] md:min-h-[520px] flex items-end">
            <img
                src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
                alt=""
                crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10"></div>
            <div className="relative z-10 p-8 md:p-16 space-y-8 w-full max-w-4xl">
                <span className="inline-block bg-red-600 text-white font-black uppercase text-[9px] tracking-[0.3em] px-3 py-1.5 rounded-full">
                    Coming Soon
                </span>
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
                    {movie.title}
                </h2>
                <div className="flex gap-3 md:gap-4">
                    {units.map(u => (
                        <div key={u.label} className="bg-black/70 border border-white/10 rounded-2xl px-4 py-3 md:px-6 md:py-4 text-center min-w-[64px] md:min-w-[84px]">
                            <div className="text-2xl md:text-4xl font-black text-white tabular-nums">{pad(u.value)}</div>
                            <div className="text-zinc-500 font-black uppercase text-[8px] md:text-[9px] tracking-[0.2em] mt-1">{u.label}</div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-4 pt-2">
                    <button
                        onClick={onRemindMe}
                        className="flex items-center gap-2 bg-white/10 border border-white/20 text-white font-black uppercase text-[10px] tracking-[0.2em] px-6 py-4 rounded-full hover:bg-white/20 transition-all"
                    >
                        Remind Me
                    </button>
                    <button
                        onClick={onExplore}
                        className="flex items-center gap-2 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] px-6 py-4 rounded-full hover:bg-red-600 hover:text-white transition-all"
                    >
                        Explore
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnpackCountdown;
