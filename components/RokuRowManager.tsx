
import React, { useState, useEffect, useMemo } from 'react';
import { useRokuConfig } from '../hooks/useRokuConfig';
import { useFestival } from '../contexts/FestivalContext';
import { Category, Movie } from '../types';

const MovieSelector: React.FC<{
    movies: Movie[];
    selected: string[];
    onToggle: (key: string) => void;
    limit?: number;
}> = ({ movies, selected, onToggle, limit }) => {
    const [filter, setFilter] = useState('');
    const filtered = movies.filter(m => m.title.toLowerCase().includes(filter.toLowerCase())).slice(0, 10);
    
    return (
        <div className="space-y-4">
            <input 
                type="text" 
                value={filter} 
                onChange={e => setFilter(e.target.value)} 
                placeholder="Search catalog..." 
                className="form-input !bg-black/40 text-xs py-2" 
            />
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                {filtered.map(m => (
                    <button 
                        key={m.key} 
                        onClick={() => onToggle(m.key)}
                        className={`text-left p-2 rounded-lg text-[10px] font-black uppercase transition-all flex justify-between items-center ${selected.includes(m.key) ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500'}`}
                    >
                        {m.title}
                        {selected.includes(m.key) && <span>✓</span>}
                    </button>
                ))}
            </div>
        </div>
    );
};

const RokuRowManager: React.FC = () => {
    const { config, saveConfig, saving } = useRokuConfig();
    const { categories: sourceCategories, movies } = useFestival();
    const movieArray = useMemo(() => Object.values(movies) as Movie[], [movies]);

    const handleUpdate = (path: string, value: any) => {
        const keys = path.split('.');
        const updates: any = { ...config };
        let current = updates;
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        saveConfig(updates);
    };

    const toggleSeparate = (key: string) => {
        const current = config.categories.separateSection || [];
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
        handleUpdate('categories.separateSection', next);
    };

    return (
        <div className="space-y-12 animate-[fadeIn_0.5s_ease-out]">
            {/* 1. Priority Row Control */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Now Streaming */}
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[3rem] shadow-2xl space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">New This Week</h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">Automatic entry based on release date</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={config.nowStreaming.enabled} onChange={e => handleUpdate('nowStreaming.enabled', e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                    </div>
                    {config.nowStreaming.enabled && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                             <div>
                                <label className="text-[10px] font-black uppercase text-gray-700 block mb-2">Row Alias</label>
                                <input value={config.nowStreaming.title} onChange={e => handleUpdate('nowStreaming.title', e.target.value)} className="form-input !bg-black/40 border-white/5" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleUpdate('nowStreaming.mode', 'auto')} className={`py-3 rounded-xl text-[9px] font-black uppercase ${config.nowStreaming.mode === 'auto' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}`}>Automatic (30d)</button>
                                <button onClick={() => handleUpdate('nowStreaming.mode', 'manual')} className={`py-3 rounded-xl text-[9px] font-black uppercase ${config.nowStreaming.mode === 'manual' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}`}>Manual Selection</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top 10 Row */}
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[3rem] shadow-2xl space-y-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Top 10 Today</h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase mt-1">Netflix-style numbered rankings</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={config.topTen.enabled} onChange={e => handleUpdate('topTen.enabled', e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-red-600 transition-all after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                    </div>
                    {config.topTen.enabled && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
                                <input type="checkbox" checked={config.topTen.showNumbers} onChange={e => handleUpdate('topTen.showNumbers', e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Render ranking numbers</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleUpdate('topTen.mode', 'auto')} className={`py-3 rounded-xl text-[9px] font-black uppercase ${config.topTen.mode === 'auto' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}`}>Top View Velocity</button>
                                <button onClick={() => handleUpdate('topTen.mode', 'manual')} className={`py-3 rounded-xl text-[9px] font-black uppercase ${config.topTen.mode === 'manual' ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-600'}`}>Manual Ranking</button>
                            </div>
                            {config.topTen.mode === 'manual' && (
                                <MovieSelector 
                                    movies={movieArray} 
                                    selected={config.topTen.movieKeys || []} 
                                    onToggle={(key) => {
                                        const current = config.topTen.movieKeys || [];
                                        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key].slice(0, 10);
                                        handleUpdate('topTen.movieKeys', next);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Categorical Manifest */}
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-10">Row Segments</h3>
                <div className="space-y-3">
                    {(Object.entries(sourceCategories) as [string, Category][]).map(([key, cat]) => {
                        const isHidden = (config.categories?.hidden || []).includes(key);
                        const isSeparate = (config.categories?.separateSection || []).includes(key);

                        return (
                            <div key={key} className={`bg-black/40 border p-6 rounded-2xl flex items-center justify-between group transition-all ${isHidden ? 'opacity-30' : 'border-white/10'}`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-2 h-2 rounded-full ${isHidden ? 'bg-gray-800' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
                                    <div>
                                        <p className="font-black text-white uppercase italic">{cat.title}</p>
                                        <span className="text-[8px] font-mono text-gray-700">NODE_ID: {key}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => toggleSeparate(key)}
                                        className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isSeparate ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 border border-white/5 hover:text-white'}`}
                                    >
                                        {isSeparate ? 'In Public Square' : 'In Main Feed'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const next = isHidden ? config.categories.hidden.filter(k => k !== key) : [...(config.categories.hidden || []), key];
                                            handleUpdate('categories.hidden', next);
                                        }}
                                        className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isHidden ? 'bg-white/5 text-gray-500' : 'bg-red-600 text-white'}`}
                                    >
                                        {isHidden ? 'HIDDEN' : 'VISIBLE'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RokuRowManager;
