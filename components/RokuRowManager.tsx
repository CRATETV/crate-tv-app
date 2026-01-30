

import React, { useState, useEffect } from 'react';
import { useRokuConfig } from '../hooks/useRokuConfig';
import { useFestival } from '../contexts/FestivalContext';
import { Category } from '../types';

const RokuRowManager: React.FC = () => {
    const { config, saveConfig, saving } = useRokuConfig();
    const { categories: sourceCategories } = useFestival();
    const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());

    useEffect(() => {
        setHiddenSet(new Set(config.categories?.hidden || []));
    }, [config]);

    const toggleVisibility = (key: string) => {
        const nextHidden = new Set(hiddenSet);
        if (nextHidden.has(key)) nextHidden.delete(key);
        else nextHidden.add(key);
        
        setHiddenSet(nextHidden);
        saveConfig({
            categories: {
                ...config.categories,
                hidden: Array.from(nextHidden)
            }
        });
    };

    const handleUpdateTitle = (key: string, title: string) => {
        saveConfig({
            categories: {
                ...config.categories,
                customTitles: {
                    ...(config.categories?.customTitles || {}),
                    [key]: title
                }
            }
        });
    };

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-indigo-500/20 p-10 rounded-[3rem] shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Categorical Manifest</h3>
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Rule: Missing flags = Visible (Netflix Model)</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* FIX: Cast Object.entries(sourceCategories) to [string, Category][] to ensure proper typing for 'cat' and resolve 'unknown' property access errors. */}
                    {(Object.entries(sourceCategories) as [string, Category][]).map(([key, cat]) => {
                        const isHidden = hiddenSet.has(key);
                        const customTitle = config.categories?.customTitles?.[key] || '';

                        return (
                            <div key={key} className={`bg-black/40 border p-6 rounded-2xl flex items-center justify-between group transition-all ${isHidden ? 'border-white/5 opacity-40' : 'border-white/10'}`}>
                                <div className="flex items-center gap-6 flex-grow">
                                    <div className={`w-2 h-2 rounded-full ${isHidden ? 'bg-gray-800' : 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]'}`}></div>
                                    <div className="flex-grow max-w-md">
                                        <div className="flex items-baseline gap-2">
                                            {/* cat.title is now correctly typed */}
                                            <p className="font-black text-white uppercase tracking-tight italic">{cat.title}</p>
                                            <span className="text-[8px] font-mono text-gray-700">NODE: {key}</span>
                                        </div>
                                        <input 
                                            type="text"
                                            defaultValue={customTitle}
                                            placeholder="Override Title (Leave blank for default)"
                                            onBlur={(e) => handleUpdateTitle(key, e.target.value)}
                                            className="w-full bg-transparent border-b border-white/5 focus:border-indigo-600 outline-none text-[10px] text-gray-400 mt-2 py-1 transition-colors"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    {/* cat.movieKeys is now correctly typed */}
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{(cat.movieKeys || []).length} Films</p>
                                    <button 
                                        onClick={() => toggleVisibility(key)}
                                        disabled={saving}
                                        className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isHidden ? 'bg-white/5 text-gray-500' : 'bg-green-600 text-white shadow-lg'}`}
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
