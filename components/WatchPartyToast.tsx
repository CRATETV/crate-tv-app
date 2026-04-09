import React, { useState, useEffect } from 'react';
import { Movie } from '../types';

interface Props {
    movie: Movie;
    onEnterLobby: () => void;
}

const WatchPartyToast: React.FC<Props> = ({ movie, onEnterLobby }) => {
    const [dismissed, setDismissed] = useState(false);
    const [visible, setVisible] = useState(false);
    const [now, setNow] = useState(new Date());

    // Slide in after 2 seconds
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (dismissed) return null;

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
    if (!startTime) return null;

    const diff = startTime.getTime() - now.getTime();
    const isStarted = diff <= 0;

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

    const startTimeStr = startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        timeZoneName: 'short'
    });

    const countdownStr = days > 0 
        ? `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m`
        : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVisible(false);
        setTimeout(() => setDismissed(true), 400);
    };

    return (
        <div
            className="fixed bottom-6 right-4 md:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] md:w-80 transition-all duration-500"
            style={{
                transform: visible ? 'translateY(0)' : 'translateY(120%)',
                opacity: visible ? 1 : 0,
            }}
        >
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Red accent bar */}
                <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-pink-600" />

                <div className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2 mt-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500">
                                {isStarted ? 'Starting Now' : 'Upcoming Watch Party'}
                            </span>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
                        >
                            <span className="text-xs leading-none">&times;</span>
                        </button>
                    </div>

                    {/* Movie info */}
                    <div className="flex items-center gap-3">
                        {movie.poster && (
                            <img
                                src={`/api/proxy-image?url=${encodeURIComponent(movie.poster)}`}
                                alt={movie.title}
                                className="w-10 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0"
                            />
                        )}
                        <div>
                            <p className="font-black text-white text-sm uppercase tracking-tight leading-tight">{movie.title}</p>
                            {movie.director && (
                                <p className="text-gray-500 text-[10px] mt-0.5">{movie.director}</p>
                            )}
                        </div>
                    </div>

                    {/* Key message */}
                    <div className="bg-white/5 rounded-xl p-3 space-y-1">
                        <p className="text-white text-xs font-bold">
                            Starts promptly at <span className="text-red-400">{startTimeStr}</span>
                        </p>
                        <p className="text-gray-500 text-[10px] leading-relaxed">
                            {isStarted 
                                ? 'The party has started — join the lobby now.'
                                : 'Get your ticket before it starts — latecomers miss the beginning.'
                            }
                        </p>
                    </div>

                    {/* Countdown */}
                    {!isStarted && (
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] text-gray-600 uppercase tracking-widest">Starts in</span>
                            <span className="font-mono font-black text-white text-sm tabular-nums">{countdownStr}</span>
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        onClick={onEnterLobby}
                        className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-all"
                    >
                        {movie.isWatchPartyPaid
                            ? `Get Ticket — $${movie.watchPartyPrice?.toFixed(2) ?? '10.00'}`
                            : 'Enter Lobby'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WatchPartyToast;
