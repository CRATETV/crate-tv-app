import React, { useState, useEffect } from 'react';
import { Movie } from '../types';

interface Props {
    movie: Movie;
    onGetTicket: () => void;
    onDismiss: () => void;
}

const WatchPartyNotificationModal: React.FC<Props> = ({ movie, onGetTicket, onDismiss }) => {
    const [now, setNow] = useState(new Date());
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const startTime = movie.watchPartyStartTime ? new Date(movie.watchPartyStartTime) : null;
    if (!startTime) return null;

    const diff = startTime.getTime() - now.getTime();
    const isStarted = diff <= 0;
    const hours   = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

    const startTimeStr = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    });
    const startDateStr = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onDismiss, 300);
    };

    const handleGetTicket = () => {
        setVisible(false);
        setTimeout(onGetTicket, 300);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={handleDismiss}
        >
            <div
                className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
                style={{
                    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
                    opacity: visible ? 1 : 0,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Red top bar */}
                <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-pink-600" />

                <div className="p-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2 mt-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500">
                                Upcoming Watch Party
                            </span>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            <span className="text-sm leading-none">&times;</span>
                        </button>
                    </div>

                    {/* Film title */}
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 mb-1">Now Showing</p>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white leading-tight">
                            {movie.title}
                        </h2>
                        {movie.director && (
                            <p className="text-gray-500 text-xs mt-1">Directed by {movie.director}</p>
                        )}
                    </div>

                    {/* Key message */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-1 border border-white/5">
                        <p className="text-white text-sm font-bold">
                            Starts promptly at <span className="text-red-400">{startTimeStr}</span>
                        </p>
                        <p className="text-gray-500 text-xs">{startDateStr}</p>
                        <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                            {isStarted
                                ? 'The party has already started — get your ticket to join now.'
                                : 'Get your ticket before it starts. The party begins on time and latecomers will not be admitted once it\'s live.'
                            }
                        </p>
                    </div>

                    {/* Countdown */}
                    {!isStarted && (
                        <div className="flex items-center justify-center gap-2">
                            <div className="text-center">
                                <div className="bg-white/10 rounded-lg px-3 py-2">
                                    <span className="text-2xl font-black text-white font-mono tabular-nums">{pad(hours)}</span>
                                </div>
                                <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1 block">hr</span>
                            </div>
                            <span className="text-white/20 text-2xl font-black pb-4">:</span>
                            <div className="text-center">
                                <div className="bg-white/10 rounded-lg px-3 py-2">
                                    <span className="text-2xl font-black text-red-400 font-mono tabular-nums">{pad(minutes)}</span>
                                </div>
                                <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1 block">min</span>
                            </div>
                            <span className="text-white/20 text-2xl font-black pb-4">:</span>
                            <div className="text-center">
                                <div className="bg-white/10 rounded-lg px-3 py-2">
                                    <span className="text-2xl font-black text-red-500 font-mono tabular-nums animate-pulse">{pad(seconds)}</span>
                                </div>
                                <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-1 block">sec</span>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleGetTicket}
                            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all"
                        >
                            {movie.isWatchPartyPaid
                                ? `Get Ticket — $${movie.watchPartyPrice?.toFixed(2) ?? '10.00'}`
                                : 'Enter Lobby'
                            }
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="w-full text-gray-600 hover:text-gray-400 text-xs py-2 transition-colors uppercase tracking-widest"
                        >
                            Remind me later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchPartyNotificationModal;
