
import React, { useState, useEffect } from 'react';
import { Category, RokuConfig } from '../types';
import { useFestival } from '../contexts/FestivalContext';

interface RokuCategoryManagerProps {
    config: RokuConfig;
    onSave: (config: Partial<RokuConfig>) => Promise<void>;
}

const RokuCategoryManager: React.FC<RokuCategoryManagerProps> = ({ config, onSave }) => {
    const { categories } = useFestival();
    const [localOrder, setLocalOrder] = useState<string[]>(config.categoryOrder || []);
    const [visibleKeys, setVisibleKeys] = useState<string[]>(config.visibleCategoryKeys || []);
    const [isFestivalMode, setIsFestivalMode] = useState(config.isFestivalModeActive || false);

    const toggleVisibility = (key: string) => {
        setVisibleKeys(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const moveCategory = (idx: number, direction: 'up' | 'down') => {
        const newOrder = [...localOrder];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newOrder.length) return;
        [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
        setLocalOrder(newOrder);
    };

    const handleCommit = async () => {
        await onSave({
            categoryOrder: localOrder,
            visibleCategoryKeys: visibleKeys,
            isFestivalModeActive: isFestivalMode
        });
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-indigo-500/20 p-10 rounded-[3rem] shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Row Configuration.</h2>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">Determine which categories are exposed on Roku hardware.</p>
                    </div>
                    <button 
                        onClick={handleCommit}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                    >
                        Sync Row Manifest
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* VISIBILITY TOGGLE */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.4em]">Available Sectors</h3>
                        <div className="grid gap-3">
                            {/* FIX: Explicitly type 'cat' as Category to resolve unknown property errors on line 63 and 64. */}
                            {Object.entries(categories).map(([key, cat]: [string, Category]) => (
                                <div key={key} className="bg-black/40 border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
                                    <div>
                                        <p className="font-black text-white uppercase tracking-tight italic">{cat.title}</p>
                                        <p className="text-[8px] text-gray-600 mt-1 uppercase font-bold">{cat.movieKeys.length} Films Synced</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleVisibility(key)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${visibleKeys.includes(key) ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                                    >
                                        {visibleKeys.includes(key) ? 'Visible' : 'Hidden'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SORT ORDER */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.4em]">Priority Ordering</h3>
                        <div className="bg-black/60 rounded-3xl border border-white/10 overscroll-y-auto overflow-hidden shadow-inner p-4 space-y-2">
                            {localOrder.map((key, idx) => {
                                const cat = categories[key];
                                if (!cat) return null;
                                return (
                                    <div key={key} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-700 font-black text-xs italic">0{idx + 1}</span>
                                            <p className="text-white font-black uppercase text-sm tracking-tight">{cat.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => moveCategory(idx, 'up')} className="p-2 bg-black rounded-lg text-gray-500 hover:text-white transition-colors">↑</button>
                                            <button onClick={() => moveCategory(idx, 'down')} className="p-2 bg-black rounded-lg text-gray-500 hover:text-white transition-colors">↓</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-8 rounded-[3rem] border transition-all duration-700 flex items-center justify-between gap-10 ${isFestivalMode ? 'bg-orange-600/10 border-orange-500/20' : 'bg-[#0f0f0f] border-white/5'}`}>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Festival Mode Protocol.</h3>
                    <p className="text-gray-500 text-sm font-medium">When active, the Roku home screen priorities switch to the live festival schedule.</p>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Master Override</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isFestivalMode} onChange={(e) => setIsFestivalMode(e.target.checked)} className="sr-only peer" />
                        <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-orange-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default RokuCategoryManager;
