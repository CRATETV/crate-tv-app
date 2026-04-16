import { cardImage } from '../services/imageUrl';
import React, { useState, useEffect } from 'react';
import { Movie } from '../types';

interface Props {
    movie: Movie;
    onEnterLobby: () => void;
}

const UpcomingWatchPartyCard: React.FC<Props> = ({ movie, onEnterLobby }) => {
    const [dismissed, setDismissed] = useState(false);
    const [now, setNow] = useState(new Date());

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
    const startDateStr = startTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="relative rounded-2xl overflow-hidden border border-red-500/20 bg-gradient-to-br from-red-950/40 via-black to-black">
            {movie.poster && (
                <div className="absolute inset-0 pointer-events-none">
                    <img
                        src={cardImage(movie.poster)}
                        alt=""
                        className="w-full h-full object-cover opacity-10 blur-md scale-105" loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/60" />
                </div>
            )}

            <div className="relative z-10 p-5 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-red-500">
                            {isStarted ? 'Watch Party Live' : 'Watch Party — Get Your Ticket'}
                        </span>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-xs"
                    >
                        &times;
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                    {movie.poster && (
                        <img
                            src={cardImage(movie.poster)}
                            alt={movie.title}
                            className="w-16 h-24 object-cover rounded-xl border border-white/10 flex-shrink-0 shadow-xl hidden md:block" loading="lazy"
                        />
                    )}

                    <div className="flex-grow space-y-1">
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white leading-none">
                            {movie.title}
                        </h3>
                        {movie.director && (
                            <p className="text-gray-500 text-xs">Directed by {movie.director}</p>
                        )}
                        <p className="text-gray-300 text-sm font-bold mt-2">
                            {isStarted ? (
                                'The party has started — enter the lobby now.'
                            ) : (
                                <>Starts promptly at <span className="text-white">{startTimeStr}</span> on {startDateStr}.</>
                            )}
                        </p>
                        {!isStarted && (
                            <p className="text-gray-600 text-[11px] mt-1">
                                Tickets must be purchased before the party begins — latecomers will not be admitted.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0 w-full md:w-auto">
                        {!isStarted && (
                            <div className="flex items-center gap-1.5">
                                {days > 0 && (
                                    <>
                                        <div className="text-center">
                                            <div className="bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5">
                                                <span className="text-xl font-black text-white font-mono tabular-nums">{pad(days)}</span>
                                            </div>
                                            <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5 block">d</span>
                                        </div>
                                        <span className="text-white/20 font-black mb-3">:</span>
                                    </>
                                )}
                                <div className="text-center">
                                    <div className="bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5">
                                        <span className="text-xl font-black text-white font-mono tabular-nums">{pad(hours)}</span>
                                    </div>
                                    <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5 block">hr</span>
                                </div>
                                <span className="text-white/20 font-black mb-3">:</span>
                                <div className="text-center">
                                    <div className="bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5">
                                        <span className="text-xl font-black text-red-400 font-mono tabular-nums">{pad(minutes)}</span>
                                    </div>
                                    <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5 block">min</span>
                                </div>
                                <span className="text-white/20 font-black mb-3">:</span>
                                <div className="text-center">
                                    <div className="bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5">
                                        <span className="text-xl font-black text-red-500 font-mono tabular-nums animate-pulse">{pad(seconds)}</span>
                                    </div>
                                    <span className="text-[8px] uppercase tracking-widest text-gray-600 mt-0.5 block">sec</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onEnterLobby}
                            className="w-full md:w-auto bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black uppercase tracking-widest text-[11px] px-6 py-3 rounded-xl transition-all shadow-xl"
                        >
                            {movie.isWatchPartyPaid
                                ? `Get Ticket — $${movie.watchPartyPrice?.toFixed(2) ?? '10.00'}`
                                : 'Enter Lobby'
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpcomingWatchPartyCard;
