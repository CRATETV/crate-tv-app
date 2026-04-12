import React, { useEffect } from 'react';
import { Movie } from '../types';

interface IntermissionScreenProps {
    currentFilm: Movie;
    nextFilm: Movie;
    currentIndex: number;
    totalFilms: number;
    secondsRemaining: number;
}

const IntermissionScreen: React.FC<IntermissionScreenProps> = ({
    currentFilm,
    nextFilm,
    currentIndex,
    totalFilms,
    secondsRemaining,
}) => {
    const progress = ((60 - secondsRemaining) / 60) * 100;
    const circumference = 2 * Math.PI * 44;

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-8">
            <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
                {Array.from({ length: totalFilms }).map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i < currentIndex ? 'w-8 bg-red-500' : i === currentIndex ? 'w-8 bg-white' : 'w-8 bg-white/20'}`} />
                ))}
            </div>

            <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-6 py-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400">Intermission</span>
                </div>
                <p className="text-gray-500 text-sm">Film {currentIndex} of {totalFilms} has ended</p>
            </div>

            <div className="w-full max-w-md mb-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600 mb-4 text-center">Up Next</p>
                <div className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                    {nextFilm.poster && (
                        <img src={nextFilm.poster} alt={nextFilm.title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0 border border-white/10" />
                    )}
                    <div className="flex flex-col justify-center gap-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-500">Film {currentIndex + 1}</p>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight leading-tight">{nextFilm.title}</h2>
                        <p className="text-xs text-gray-500">Directed by {nextFilm.director}</p>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-3">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="#1a1a1a" strokeWidth="6" />
                        <circle cx="50" cy="50" r="44" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - progress / 100)}
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-black text-white tabular-nums">{secondsRemaining}</span>
                    </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Next film begins in</p>
            </div>
        </div>
    );
};

export default IntermissionScreen;
