
import React, { useState } from 'react';
import { Category, RokuConfig, RokuCategoryConfig } from '../types';
import { useFestival } from '../contexts/FestivalContext';

interface RokuCategoryManagerProps {
    config: RokuConfig;
    onSave: (config: Partial<RokuConfig>) => Promise<void>;
}

const RokuCategoryManager: React.FC<RokuCategoryManagerProps> = ({ config, onSave }) => {
    const { categories } = useFestival();
    
    // Merge source categories with overrides
    // FIX: Explicitly cast Object.entries(categories) to [string, Category][] to resolve 'unknown' type inference issue for cat variable.
    const initialLocalState = (Object.entries(categories) as [string, Category][]).map(([key, cat]) => {
        const override = config.categories?.find(c => c.categoryKey === key);
        return {
            categoryKey: key,
            title: cat.title,
            order: override?.order ?? 999,
            isVisible: override?.isVisible ?? true,
            customTitle: override?.customTitle || ''
        };
    }).sort((a, b) => a.order - b.order);

    const [localCategories, setLocalCategories] = useState(initialLocalState);
    const [isFestivalMode, setIsFestivalMode] = useState(config.isFestivalModeActive || false);

    const toggleVisibility = (key: string) => {
        setLocalCategories(prev => prev.map(c => 
            c.categoryKey === key ? { ...c, isVisible: !c.isVisible } : c
        ));
    };

    const moveCategory = (idx: number, direction: 'up' | 'down') => {
        const newOrder = [...localCategories];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newOrder.length) return;
        [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
        setLocalCategories(newOrder);
    };

    const handleCommit = async () => {
        const categoryConfig: RokuCategoryConfig[] = localCategories.map((c, idx) => ({
            categoryKey: c.categoryKey,
            order: idx,
            isVisible: c.isVisible,
            customTitle: c.customTitle || undefined
        }));

        await onSave({
            categories: categoryConfig,
            isFestivalModeActive: isFestivalMode
        });
    };

    const handleShowAll = async () => {
        const reset = localCategories.map(c => ({ ...c, isVisible: true }));
        setLocalCategories(reset);
        await onSave({ categories: [], isFestivalModeActive: isFestivalMode });
        alert("Restored global visibility.");
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
                    {localCategories.map((cat, idx) => (
                        <div key={cat.categoryKey} className={`bg-black/40 border p-5 rounded-2xl flex items-center justify-between group transition-all ${cat.isVisible ? 'border-white/10' : 'border-red-900/20 opacity-50'}`}>
                            <div className="flex items-center gap-6">
                                <span className="text-gray-700 font-black text-xs italic">0{idx + 1}</span>
                                <div>
                                    <p className="font-black text-white uppercase tracking-tight italic">{cat.title}</p>
                                    <p className="text-[8px] text-gray-600 mt-1 uppercase font-bold">{categories[cat.categoryKey]?.movieKeys?.length || 0} Films Synced</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => moveCategory(idx, 'up')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">↑</button>
                                    <button onClick={() => moveCategory(idx, 'down')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">↓</button>
                                </div>
                                <button 
                                    onClick={() => toggleVisibility(cat.categoryKey)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cat.isVisible ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                                >
                                    {cat.isVisible ? 'Visible' : 'Hidden'}
                                </button>
                            </div>
                        </div>
                    ))}
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
