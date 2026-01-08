import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '../types';

const TrailerStage: React.FC<{ movie: Movie }> = ({ movie }) => {
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.play().catch(() => {
                console.warn("Autoplay blocked for trailer stage");
            });
        }
    }, [movie.key]);

    return (
        <div className="relative aspect-video lg:aspect-[2.35/1] bg-black rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,1)] border border-white/10 group">
            <video 
                ref={videoRef}
                key={movie.key}
                src={movie.trailer || movie.fullMovie}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            
            <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row justify-between items-end gap-6 z-20">
                <div className="space-y-2 max-w-2xl">
                    <span className="text-red-500 font-black uppercase tracking-[0.4em] text-[9px] mb-2 block">NOW_SCREENING_STUDIO</span>
                    <h4 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none drop-shadow-2xl">{movie.title}</h4>
                    <p className="text-gray-300 text-sm md:text-lg font-medium italic line-clamp-2 drop-shadow-lg">"{movie.synopsis.replace(/<[^>]+>/g, '')}"</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="bg-black/60 backdrop-blur-md p-4 rounded-full border border-white/20 hover:bg-white/10 transition-all"
                    >
                        {isMuted ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.982 5.982 0 0115 10a5.982 5.982 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.987 3.987 0 0013 10a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>
                        )}
                    </button>
                    <button 
                        onClick={() => window.location.href = `/movie/${movie.key}?play=true`}
                        className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        Master Session ⚡
                    </button>
                </div>
            </div>
            
            <div className="absolute top-8 left-8 pointer-events-none">
                <div className="bg-red-600/20 backdrop-blur-md px-3 py-1 rounded border border-red-500/30">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Live Visual Feed</p>
                </div>
            </div>
        </div>
    );
};

const ZineTrailerPark: React.FC<{ movies: Movie[] }> = ({ movies }) => {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeMovie = movies[selectedIdx] || movies[0];

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h3 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">THE CINEMA STAGE 🍿</h3>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.6em] mt-3">High-Bitrate Kinetic Dispatches</p>
                </div>
                <div className="flex items-center gap-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                    <span>{selectedIdx + 1} OF {movies.length} SLOTS</span>
                    <div className="h-px w-20 bg-white/5"></div>
                </div>
            </div>

            <TrailerStage movie={activeMovie} />

            <div className="relative group/carousel">
                <div 
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide pb-8 px-2 -mx-2 snap-x"
                >
                    {movies.map((m, idx) => (
                        <div 
                            key={m.key} 
                            onClick={() => setSelectedIdx(idx)}
                            className={`flex-shrink-0 w-64 aspect-video rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 border-2 snap-start ${selectedIdx === idx ? 'border-red-600 scale-105 shadow-[0_0_40px_rgba(239,68,68,0.2)]' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                        >
                            <img src={m.poster} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white text-center px-4 leading-tight">{m.title}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Scroll Indicators for large lists */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                    {movies.slice(0, 10).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${Math.floor(selectedIdx/1) === i ? 'bg-red-600 w-4' : 'bg-white/10'}`}></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ZineTrailerPark;