
import React, { useState } from 'react';
import { Movie } from '../types';

interface FeaturedCarouselProps {
    allMovies: Movie[];
    featuredKeys: string[];
    onSave: (keys: string[]) => Promise<void>;
}

const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({ allMovies, featuredKeys, onSave }) => {
    const [selected, setSelected] = useState<string[]>(featuredKeys || []);

    const toggle = (key: string) => {
        if (selected.includes(key)) {
            setSelected(selected.filter(k => k !== key));
        } else {
            if (selected.length >= 5) {
                alert("Maximum 5 slots available in Hero Carousel.");
                return;
            }
            setSelected([...selected, key]);
        }
    };

    const handleCommit = async () => {
        await onSave(selected);
    };

    const eligibleMovies = allMovies
        .filter(m => !m.isUnlisted && !!m.poster)
        .sort((a,b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-red-500/20 p-10 rounded-[3rem] shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Spotlight Controller.</h2>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">Configure the high-velocity hero carousel for the Roku landing page (Max 5).</p>
                    </div>
                    <button 
                        onClick={handleCommit}
                        className="bg-red-600 hover:bg-red-700 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                    >
                        Sync Spotlight
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {eligibleMovies.map(movie => {
                        const isSelected = selected.includes(movie.key);
                        const hasHero = !!movie.rokuHeroImage;
                        return (
                            <div 
                                key={movie.key} 
                                onClick={() => toggle(movie.key)}
                                className={`relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-red-600 scale-105 shadow-2xl' : 'border-white/5 opacity-40 hover:opacity-100'}`}
                            >
                                <img src={movie.poster} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                <div className="absolute bottom-2 left-2 right-2">
                                    <p className="text-[7px] font-black text-white uppercase truncate">{movie.title}</p>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-lg">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                )}
                                {!hasHero && isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-center">
                                        <p className="text-[6px] font-black text-amber-500 uppercase tracking-widest">Asset Warning: Fallback in use</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FeaturedCarousel;
