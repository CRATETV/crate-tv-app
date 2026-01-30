
import React, { useState } from 'react';
import { useRokuConfig } from '../hooks/useRokuConfig';
import { Movie } from '../types';

interface RokuHeroManagerProps {
    allMovies: Movie[];
}

const RokuHeroManager: React.FC<RokuHeroManagerProps> = ({ allMovies }) => {
    const { config, saveConfig, saving } = useRokuConfig();
    const [searchTerm, setSearchTerm] = useState('');

    const toggleMode = () => {
        saveConfig({
            hero: { ...config.hero, mode: config.hero.mode === 'auto' ? 'manual' : 'auto' }
        });
    };

    const toggleMovieInHero = (key: string) => {
        const currentItems = config.hero.items || [];
        const exists = currentItems.find(i => i.movieKey === key);
        
        if (exists) {
            saveConfig({
                hero: { 
                    ...config.hero, 
                    items: currentItems.filter(i => i.movieKey !== key).map((item, idx) => ({ ...item, order: idx }))
                }
            });
        } else {
            if (currentItems.length >= 5) return alert("Limit: 5 Spotlight Slots.");
            saveConfig({
                hero: {
                    ...config.hero,
                    items: [...currentItems, { movieKey: key, order: currentItems.length }]
                }
            });
        }
    };

    const sortedManualItems = [...(config.hero.items || [])].sort((a, b) => a.order - b.order);
    const filteredMovies = allMovies
        .filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-red-500/20 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <div className="max-w-xl">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Spotlight Logic.</h3>
                        <p className="text-gray-400 mt-2 font-medium">Control the first experience on the TV screen.</p>
                    </div>
                    
                    <div className="bg-black border border-white/10 p-2 rounded-2xl flex gap-2">
                        <button 
                            onClick={() => config.hero.mode !== 'auto' && toggleMode()}
                            className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${config.hero.mode === 'auto' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            Automated (Top Films)
                        </button>
                        <button 
                            onClick={() => config.hero.mode !== 'manual' && toggleMode()}
                            className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${config.hero.mode === 'manual' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            Manual Selection
                        </button>
                    </div>
                </div>
            </div>

            {config.hero.mode === 'manual' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Selector */}
                    <div className="lg:col-span-5 bg-black/40 border border-white/5 p-8 rounded-[2.5rem] flex flex-col h-[600px]">
                        <input 
                            type="text"
                            placeholder="Filter Catalog..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="form-input bg-black/60 border-white/10 mb-6"
                        />
                        <div className="flex-grow overflow-y-auto pr-2 scrollbar-hide space-y-2">
                            {filteredMovies.map(movie => {
                                const isSelected = !!config.hero.items?.find(i => i.movieKey === movie.key);
                                return (
                                    <button 
                                        key={movie.key}
                                        onClick={() => toggleMovieInHero(movie.key)}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all group ${isSelected ? 'bg-red-600/10 border-red-500/30' : 'bg-white/5 border-transparent'}`}
                                    >
                                        <img src={movie.poster} className="w-10 h-14 object-cover rounded-lg" alt="" />
                                        <div className="flex-grow">
                                            <p className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-400'}`}>{movie.title}</p>
                                            <p className="text-[9px] text-gray-700 font-bold uppercase mt-1">Dir. {movie.director}</p>
                                        </div>
                                        {isSelected && <span className="text-red-500 text-xs font-bold italic">IN ROTATION</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Stage */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex justify-between items-center px-4">
                            <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em]">Rotation Stage (Max 5)</h4>
                            <span className="text-[9px] font-black text-red-500 uppercase">{sortedManualItems.length} Active Nodes</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {sortedManualItems.map((item, idx) => {
                                const movie = allMovies.find(m => m.key === item.movieKey);
                                if (!movie) return null;
                                return (
                                    <div key={item.movieKey} className="bg-[#0f0f0f] border border-white/10 p-6 rounded-[2rem] flex items-center justify-between shadow-xl animate-[fadeIn_0.3s_ease-out]">
                                        <div className="flex items-center gap-6">
                                            <span className="text-3xl font-black text-gray-800 italic">0{idx + 1}</span>
                                            <img src={movie.poster} className="w-16 h-20 object-cover rounded-xl border border-white/10 shadow-2xl" alt="" />
                                            <div>
                                                <h5 className="text-xl font-black text-white uppercase italic tracking-tighter">{movie.title}</h5>
                                                <p className="text-[9px] text-gray-600 uppercase font-bold mt-1 tracking-widest">Manual Node Secured</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleMovieInHero(movie.key)} className="text-[9px] font-black uppercase text-gray-700 hover:text-red-500 transition-colors">Erase Slot</button>
                                    </div>
                                );
                            })}
                            {sortedManualItems.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-20">
                                    <p className="text-gray-500 font-black uppercase tracking-[0.5em]">Rotation manifest empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RokuHeroManager;
