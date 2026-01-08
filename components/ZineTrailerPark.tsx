import React, { useState, useRef } from 'react';
import { Movie } from '../types';

const TrailerCard: React.FC<{ movie: Movie }> = ({ movie }) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    return (
        <div 
            className="flex-shrink-0 w-80 relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl border border-white/5"
            onMouseEnter={() => { setIsHovered(true); videoRef.current?.play(); }}
            onMouseLeave={() => { setIsHovered(false); videoRef.current?.pause(); if(videoRef.current) videoRef.current.currentTime = 0; }}
            onClick={() => window.location.href = `/movie/${movie.key}?play=true`}
        >
            <div className="aspect-video bg-black relative">
                <img 
                    src={movie.poster} 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isHovered ? 'opacity-0' : 'opacity-80'}`} 
                    alt="" 
                />
                <video 
                    ref={videoRef}
                    src={movie.trailer || movie.fullMovie}
                    muted
                    loop
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-black uppercase text-xs tracking-tighter truncate">{movie.title}</p>
                    <p className="text-gray-500 text-[8px] font-bold uppercase tracking-widest mt-1">🎬 Start Session</p>
                </div>
            </div>
        </div>
    );
};

const ZineTrailerPark: React.FC<{ movies: Movie[] }> = ({ movies }) => {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">The Trailer Park 🍿</h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Hover to synchronize dispatches</p>
                </div>
            </div>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2 snap-x">
                {movies.map(m => (
                    <div key={m.key} className="snap-start">
                        <TrailerCard movie={m} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ZineTrailerPark;