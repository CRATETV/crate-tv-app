
import React, { useState, useMemo } from 'react';
import { useRokuConfig } from '../hooks/useRokuConfig';
import { Movie } from '../types';

interface RokuContentFilterProps {
    allMovies: Movie[];
}

const RokuContentFilter: React.FC<RokuContentFilterProps> = ({ allMovies }) => {
    const { config, saveConfig, saving } = useRokuConfig();
    const [searchTerm, setSearchTerm] = useState('');

    const hiddenMovies = useMemo(() => new Set(config.content?.hiddenMovies || []), [config]);

    const toggleVisibility = (key: string) => {
        const nextHidden = new Set(hiddenMovies);
        if (nextHidden.has(key)) nextHidden.delete(key);
        else nextHidden.add(key);

        saveConfig({
            content: {
                ...config.content,
                hiddenMovies: Array.from(nextHidden)
            }
        });
    };

    const filteredMovies = allMovies
        .filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-amber-500/20 p-10 rounded-[3rem] shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Content Perimeter</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Rule: Explicit Hide // Standard Show</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="bg-black border border-white/10 px-6 py-2 rounded-xl text-center">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active Filters</p>
                            <p className="text-sm font-black text-amber-500">{hiddenMovies.size} Blocked</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl">
                    <input 
                        type="text"
                        placeholder="Search for content to filter..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="form-input bg-black/60 border-white/10"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMovies.map(movie => {
                    const isHidden = hiddenMovies.has(movie.key);
                    return (
                        <div key={movie.key} className={`bg-[#0f0f0f] border p-6 rounded-[2.5rem] flex items-center justify-between group transition-all ${isHidden ? 'border-red-600/30 opacity-40' : 'border-white/5 hover:border-white/20 shadow-xl'}`}>
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-900 border border-white/10">
                                    <img src={movie.poster} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-white uppercase truncate">{movie.title}</h4>
                                    <p className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter mt-1">{isHidden ? 'PERIMETER_BLOCKED' : 'NOMINAL'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleVisibility(movie.key)}
                                disabled={saving}
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isHidden ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 border border-white/5 hover:bg-white hover:text-black'}`}
                            >
                                {isHidden ? 'LOCKED' : 'OPEN'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RokuContentFilter;
