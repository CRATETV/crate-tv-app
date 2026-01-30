
import React, { useState, useEffect } from 'react';
import { Category, RokuConfig } from '../types';
import { useFestival } from '../contexts/FestivalContext';

interface RokuCategoryManagerProps {
    config: RokuConfig;
    onSave: (config: Partial<RokuConfig>) => Promise<void>;
}

const RokuCategoryManager: React.FC<RokuCategoryManagerProps> = ({ config, onSave }) => {
    const { categories } = useFestival();
    const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
    const [order, setOrder] = useState<string[]>([]);
    const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
    const [separateSection, setSeparateSection] = useState<string[]>([]);
    const [mode, setMode] = useState<'all' | 'custom'>('all');

    useEffect(() => {
        if (config.categories) {
            setHiddenSet(new Set(config.categories.hidden || []));
            setOrder(config.categories.order || []);
            setCustomTitles(config.categories.customTitles || {});
            setSeparateSection(config.categories.separateSection || []);
            setMode(config.categories.mode || 'all');
        }
    }, [config]);

    const toggleVisibility = (key: string) => {
        const nextHidden = new Set(hiddenSet);
        if (nextHidden.has(key)) nextHidden.delete(key);
        else nextHidden.add(key);
        setHiddenSet(nextHidden);
    };

    const handleUpdateTitle = (key: string, title: string) => {
        setCustomTitles(prev => ({ ...prev, [key]: title }));
    };

    const handleCommit = async () => {
        await onSave({
            categories: {
                mode,
                hidden: Array.from(hiddenSet),
                order,
                customTitles,
                separateSection
            }
        });
        alert("Category manifest synchronized.");
    };

    const handleShowAll = async () => {
        if (!window.confirm("Restore global visibility for all categories?")) return;
        setHiddenSet(new Set());
        setMode('all');
        await onSave({
            categories: {
                mode: 'all',
                hidden: [],
                order,
                customTitles,
                separateSection
            }
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
                    <div className="flex gap-4">
                        <button onClick={handleShowAll} className="bg-white/5 border border-white/10 text-gray-500 hover:text-white font-black px-6 py-4 rounded-2xl uppercase tracking-widest text-xs transition-all">Show All</button>
                        <button 
                            onClick={handleCommit}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                        >
                            Sync Row Manifest
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {(Object.entries(categories) as [string, Category][]).map(([key, cat], idx) => {
                        const isHidden = hiddenSet.has(key);
                        return (
                            <div key={key} className={`bg-black/40 border p-5 rounded-2xl flex items-center justify-between group transition-all ${!isHidden ? 'border-white/10' : 'border-red-900/20 opacity-50'}`}>
                                <div className="flex items-center gap-6">
                                    <span className="text-gray-700 font-black text-xs italic">0{idx + 1}</span>
                                    <div>
                                        <p className="font-black text-white uppercase tracking-tight italic">{cat.title}</p>
                                        <input 
                                            type="text"
                                            defaultValue={customTitles[key] || ''}
                                            placeholder="Override Title..."
                                            onBlur={(e) => handleUpdateTitle(key, e.target.value)}
                                            className="bg-transparent border-b border-white/5 text-[10px] text-indigo-400 mt-1 outline-none focus:border-indigo-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => toggleVisibility(key)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isHidden ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                                    >
                                        {!isHidden ? 'Visible' : 'Hidden'}
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

export default RokuCategoryManager;
