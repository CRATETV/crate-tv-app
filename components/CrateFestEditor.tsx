import React, { useState, useMemo } from 'react';
import { CrateFestConfig, Movie } from '../types';

interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
}

const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({ allMovies, initialSelectedKeys, onSave, onClose }) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initialSelectedKeys);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSelection = (key: string) => {
    setSelectedKeys(prev => 
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const filteredMovies = useMemo(() => {
    return allMovies
      .filter(movie => (movie.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [allMovies, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-[#111] rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-white/5">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Select Films</h3>
            <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedKeys.length} Selected</span>
          </div>
          <input
            type="text"
            placeholder="Filter catalog..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full form-input !bg-white/5 border-white/10"
          />
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {filteredMovies.map(movie => {
            const isSelected = selectedKeys.includes(movie.key);
            return (
                <label key={movie.key} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-red-600/10 border-red-500/30' : 'hover:bg-white/5 border-transparent'}`}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(movie.key)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500"
                />
                <div className="flex items-center gap-3">
                    <img src={movie.poster} className="w-10 h-14 object-cover rounded shadow-lg" alt="" />
                    <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight">{movie.title}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{movie.director}</p>
                    </div>
                </div>
                </label>
            );
          })}
        </div>
        <div className="p-8 border-t border-white/5 flex gap-4">
          <button onClick={onClose} className="flex-1 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">Cancel</button>
          <button onClick={() => onSave(selectedKeys)} className="flex-[2] bg-white text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all shadow-xl">Apply Selection</button>
        </div>
      </div>
    </div>
  );
};

interface CrateFestEditorProps {
    config: CrateFestConfig;
    allMovies: Record<string, Movie>;
    onSave: (config: CrateFestConfig) => Promise<void>;
    isSaving: boolean;
}

const CrateFestEditor: React.FC<CrateFestEditorProps> = ({ config: initialConfig, allMovies, onSave, isSaving }) => {
    const [config, setConfig] = useState<CrateFestConfig>(initialConfig);
    const [editingBlockIdx, setEditingBlockIdx] = useState<number | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseFloat(value) : value)
        }));
    };

    const addBlock = () => {
        setConfig(prev => ({
            ...prev,
            movieBlocks: [...prev.movieBlocks, { title: 'New Category', movieKeys: [] }]
        }));
    };

    const updateBlock = (idx: number, updates: any) => {
        const newBlocks = [...config.movieBlocks];
        newBlocks[idx] = { ...newBlocks[idx], ...updates };
        setConfig({ ...config, movieBlocks: newBlocks });
    };

    const handleBlockMovieSave = (keys: string[]) => {
        if (editingBlockIdx !== null) {
            updateBlock(editingBlockIdx, { movieKeys: keys });
            setEditingBlockIdx(null);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Crate Fest Control</h3>
                    <p className="text-gray-400 mt-2 font-medium">Coordinate the dynamic paywall and curate the discovery experience.</p>
                </div>
                <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">LIVE STATUS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            name="isActive" 
                            checked={config.isActive} 
                            onChange={(e) => setConfig({...config, isActive: e.target.checked})} 
                            className="sr-only peer" 
                        />
                        <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <section className="bg-[#0f0f0f] p-8 md:p-12 rounded-[2.5rem] border border-white/5 space-y-8">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Session Identity</h4>
                    <div className="space-y-6">
                        <div>
                            <label className="form-label">Event Headline</label>
                            <input name="title" value={config.title} onChange={handleChange} placeholder="e.g. Crate Fest 2026" className="form-input bg-black/40" />
                        </div>
                        <div>
                            <label className="form-label">Marketing Narrative</label>
                            <textarea name="tagline" value={config.tagline} onChange={handleChange} placeholder="The pop-up cinema experience..." className="form-input bg-black/40" rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Window Opens</label>
                                <input type="datetime-local" name="startDate" value={config.startDate?.slice(0, 16)} onChange={handleChange} className="form-input bg-black/40" />
                            </div>
                            <div>
                                <label className="form-label">Window Closes</label>
                                <input type="datetime-local" name="endDate" value={config.endDate?.slice(0, 16)} onChange={handleChange} className="form-input bg-black/40" />
                            </div>
                        </div>
                        <div className="p-6 bg-red-600/5 border border-red-500/10 rounded-2xl">
                            <label className="form-label !text-red-500">All-Access Pass Price (USD)</label>
                            <div className="relative mt-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <input 
                                    type="number" 
                                    name="passPrice" 
                                    value={config.passPrice} 
                                    onChange={handleChange} 
                                    className="form-input !pl-8 bg-black/40 text-green-500 font-black text-3xl tracking-tighter" 
                                    step="1"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[#0f0f0f] p-8 md:p-12 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">02. Event Content</h4>
                        <button onClick={addBlock} className="bg-white/10 hover:bg-white text-gray-400 hover:text-black font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all">Add Category Block</button>
                    </div>

                    <div className="p-6 bg-purple-600/10 border border-purple-500/20 rounded-2xl">
                        <label className="form-label !text-purple-400">Featured Live Event</label>
                        <select 
                            name="featuredWatchPartyKey" 
                            value={config.featuredWatchPartyKey || ''} 
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 text-white p-3 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                        >
                            <option value="">None / Hide Banner</option>
                            {/* FIX: Cast Object.values(allMovies) to Movie[] to resolve property access errors on type unknown. */}
                            {(Object.values(allMovies) as Movie[]).sort((a,b) => a.title.localeCompare(b.title)).map(m => (
                                <option key={m.key} value={m.key}>{m.title}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-gray-600 font-bold uppercase mt-3 tracking-widest">This film will be spotlighted as the "Live Now" event on the Crate Fest Hub.</p>
                    </div>
                    
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {config.movieBlocks.map((block, bIdx) => (
                            <div key={bIdx} className="bg-black/60 p-6 rounded-3xl border border-white/5 space-y-6 group">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <input 
                                        value={block.title} 
                                        onChange={(e) => updateBlock(bIdx, { title: e.target.value })} 
                                        className="bg-transparent text-white font-black text-xl uppercase tracking-tight focus:outline-none placeholder:text-gray-800" 
                                        placeholder="Category Title..."
                                    />
                                    <button onClick={() => {
                                        const next = [...config.movieBlocks];
                                        next.splice(bIdx, 1);
                                        setConfig({...config, movieBlocks: next});
                                    }} className="text-gray-700 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-colors">Erase</button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {block.movieKeys.length > 0 ? block.movieKeys.map(k => (
                                        <div key={k} className="bg-white/5 border border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                                            {allMovies[k]?.title || 'Unknown Film'}
                                            <button onClick={() => {
                                                const nextKeys = block.movieKeys.filter(key => key !== k);
                                                updateBlock(bIdx, { movieKeys: nextKeys });
                                            }} className="text-gray-500 hover:text-red-500 font-black">×</button>
                                        </div>
                                    )) : (
                                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No films mapped</p>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setEditingBlockIdx(bIdx)}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-xl border border-white/10 transition-all uppercase text-[10px] tracking-widest"
                                >
                                    Manage Selection
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="pt-12 border-t border-white/5 flex justify-center">
                <button 
                    onClick={() => onSave(config)} 
                    disabled={isSaving}
                    className="bg-red-600 hover:bg-red-700 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-2xl transition-all transform active:scale-95 disabled:opacity-20 text-sm"
                >
                    {isSaving ? 'Synchronizing Cluster...' : 'Push Global Manifest'}
                </button>
            </div>

            {editingBlockIdx !== null && (
                <MovieSelectorModal 
                    allMovies={Object.values(allMovies)} 
                    initialSelectedKeys={config.movieBlocks[editingBlockIdx].movieKeys} 
                    onSave={handleBlockMovieSave} 
                    onClose={() => setEditingBlockIdx(null)} 
                />
            )}
        </div>
    );
};

export default CrateFestEditor;
