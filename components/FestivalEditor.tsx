import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig, FilmBlock } from '../types';

interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
}

const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({ allMovies, initialSelectedKeys, onSave, onClose }) => {
  const [selectedKeys, setSelectedKeys] = useState(new Set(initialSelectedKeys));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSelection = (key: string) => {
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedKeys(newSelection);
  };

  const handleSave = () => {
    onSave(Array.from(selectedKeys));
  };

  const filteredMovies = allMovies
    .filter(movie => (movie.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Program Works</h3>
            <span className="text-[10px] font-black bg-red-600/20 text-red-500 px-3 py-1 rounded-full uppercase">{selectedKeys.size} Selected</span>
          </div>
          <input
            type="text"
            placeholder="Scan catalog manifest..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-red-600 transition-all text-sm"
          />
        </div>
        <div className="p-6 overflow-y-auto scrollbar-hide space-y-2">
            {filteredMovies.map(movie => (
              <label key={movie.key} className={`flex items-center space-x-4 p-4 rounded-2xl transition-all border cursor-pointer ${selectedKeys.has(movie.key) ? 'bg-red-600/10 border-red-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(movie.key)}
                  onChange={() => toggleSelection(movie.key)}
                  className="h-5 w-5 rounded bg-gray-800 border-gray-700 text-red-600 focus:ring-red-500"
                />
                <div className="flex items-center gap-3">
                    <img src={movie.poster} className="w-10 h-14 object-cover rounded-lg shadow-lg" alt="" />
                    <div>
                        <span className="text-sm font-black text-white uppercase tracking-tight block">{movie.title}</span>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Dir. {movie.director}</span>
                    </div>
                </div>
              </label>
            ))}
        </div>
        <div className="p-8 border-t border-white/5 flex justify-end gap-4 bg-white/[0.01]">
          <button onClick={onClose} className="text-[10px] font-black uppercase text-gray-500 hover:text-white transition-colors">Discard</button>
          <button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Save Selections</button>
        </div>
      </div>
    </div>
  );
};

interface FestivalEditorProps {
    data: FestivalDay[];
    config: FestivalConfig;
    allMovies: Record<string, Movie>;
    onDataChange: (data: FestivalDay[]) => void;
    onConfigChange: (config: FestivalConfig) => void;
    onSave: () => void;
    isSaving: boolean;
}

const formatISOForInput = (isoString?: string): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
};

const FestivalEditor: React.FC<FestivalEditorProps> = ({ data, config, allMovies, onDataChange, onConfigChange, onSave, isSaving }) => {
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleSaveManifest = () => {
      onSave();
      setIsDirty(false);
  };

  const handleBlockChange = (dayIndex: number, blockIndex: number, field: string, value: any) => {
    setIsDirty(true);
    const newData = [...data];
    newData[dayIndex].blocks[blockIndex] = { ...newData[dayIndex].blocks[blockIndex], [field]: value };
    onDataChange(newData);
  };
  
  const handleMovieSelectionSave = (dayIndex: number, blockIndex: number, newMovieKeys: string[]) => {
    setIsDirty(true);
    const newData = [...data];
    newData[dayIndex].blocks[blockIndex].movieKeys = newMovieKeys;
    onDataChange(newData);
    setEditingBlock(null);
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsDirty(true);
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'datetime-local') finalValue = value ? new Date(value).toISOString() : '';
    else if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
    onConfigChange({ ...config, [name]: finalValue });
  };

  const addDay = () => {
    setIsDirty(true);
    const newDayNum = data.length + 1;
    onDataChange([...data, { day: newDayNum, date: 'October 20, 2026', blocks: [] }]);
  };

  const removeDay = (index: number) => {
      if (!window.confirm("Remove this session day?")) return;
      setIsDirty(true);
      const filtered = data.filter((_, i) => i !== index);
      const reindexed = filtered.map((d, i) => ({ ...d, day: i + 1 }));
      onDataChange(reindexed);
  };

  const addBlock = (dayIndex: number) => {
    setIsDirty(true);
    const newBlock: FilmBlock = {
      id: `block_${Date.now()}`,
      title: 'New Official Block',
      time: '7:00 PM',
      movieKeys: [],
      price: 10.00
    };
    const newData = [...data];
    newData[dayIndex].blocks.push(newBlock);
    onDataChange(newData);
  };
  
  const removeBlock = (dayIndex: number, blockIndex: number) => {
     setIsDirty(true);
     const newData = [...data];
     newData[dayIndex].blocks.splice(blockIndex, 1);
     onDataChange(newData);
  };

  return (
    <div className="space-y-12 pb-32 animate-[fadeIn_0.5s_ease-out]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Festival Manager</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Direct-sync mode active.</p>
        </div>
        <div className="flex items-center gap-4">
             <button 
                onClick={handleSaveManifest} 
                disabled={isSaving || !isDirty} 
                className={`font-black py-4 px-12 rounded-2xl uppercase tracking-widest text-xs shadow-2xl transition-all active:scale-95 ${isDirty ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
            >
                {isSaving ? 'Syncing Cluster...' : 'Sync Live Network'}
            </button>
        </div>
      </div>
      
      <div className="bg-[#0f0f0f] p-10 rounded-[3rem] border border-white/5 space-y-10 shadow-xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-6">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">01. Global Identity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                  <label className="form-label">Festival Title</label>
                  <input type="text" name="title" value={config.title || ''} onChange={handleConfigChange} className="form-input bg-black/40 font-black uppercase italic" />
              </div>
              <div>
                  <label className="form-label">Sub-Heading (Tagline)</label>
                  <input type="text" name="subheader" value={config.subheader || ''} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
              <div className="md:col-span-2">
                  <label className="form-label">Description Brief</label>
                  <textarea name="description" value={config.description || ''} onChange={handleConfigChange} className="form-input bg-black/40 h-24" />
              </div>
              <div>
                  <label className="form-label">Festival Start Date (Calendar)</label>
                  <input type="datetime-local" name="startDate" value={formatISOForInput(config.startDate)} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
              <div>
                  <label className="form-label">Festival End Date (Calendar)</label>
                  <input type="datetime-local" name="endDate" value={formatISOForInput(config.endDate)} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
              <div className="flex items-center justify-between gap-4 bg-black/20 p-6 rounded-2xl border border-white/5 md:col-span-2">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Portal Access</span>
                    <p className="text-[8px] text-gray-700 uppercase font-bold mt-1">Make visible to public web nodes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="isFestivalLive" checked={config.isFestivalLive} onChange={handleConfigChange} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
          </div>
      </div>

      <div className="space-y-12">
        <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black uppercase italic tracking-widest text-white">Event Timeline</h3>
            <button 
                onClick={addDay} 
                className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all"
            >
                + Append Session Day
            </button>
        </div>

        {data.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-10 relative group/day">
            <button 
                onClick={() => removeDay(dayIndex)}
                className="absolute top-10 right-10 text-[9px] font-black text-gray-800 hover:text-red-500 uppercase tracking-widest transition-colors opacity-0 group-hover/day:opacity-100"
            >
                Purge Day 0{day.day}
            </button>

            <div className="flex flex-col md:flex-row items-center gap-10 border-b border-white/5 pb-10">
                <div className="bg-red-600 text-white w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black italic tracking-tighter shadow-[0_15px_30px_rgba(239,68,68,0.3)]">
                    <span className="text-3xl leading-none">0{day.day}</span>
                </div>
                <div className="flex-grow w-full">
                    <label className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-3 block">Display Date</label>
                    <input 
                        value={day.date} 
                        onChange={e => {
                            const newData = [...data];
                            newData[dayIndex].date = e.target.value;
                            onDataChange(newData);
                        }} 
                        className="bg-transparent text-white font-black text-4xl uppercase tracking-tighter outline-none focus:text-red-500 transition-colors w-full" 
                        placeholder="e.g. October 24, 2026" 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {day.blocks.map((block, blockIndex) => (
                <div key={blockIndex} className="bg-black/60 p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-10 group shadow-inner">
                   <div className="flex-grow space-y-4 w-full md:w-auto">
                        <div className="space-y-1">
                            <label className="text-[8px] text-gray-700 font-black tracking-widest uppercase">Block Identity</label>
                            <input value={block.title} onChange={e => handleBlockChange(dayIndex, blockIndex, 'title', e.target.value)} className="bg-transparent text-white font-black text-2xl uppercase tracking-tight outline-none w-full italic" placeholder="Block Title" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] text-gray-700 font-black tracking-widest uppercase">Start Time</label>
                            <input value={block.time} onChange={e => handleBlockChange(dayIndex, blockIndex, 'time', e.target.value)} className="bg-transparent text-gray-400 text-sm font-black uppercase tracking-widest outline-none border-b border-white/5" placeholder="7:00 PM" />
                        </div>
                   </div>
                   <div className="flex items-center gap-6 flex-shrink-0">
                     <button onClick={() => setEditingBlock({ dayIndex, blockIndex })} className="bg-white text-black font-black px-8 py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all shadow-xl active:scale-95">Program Selections ({block.movieKeys.length})</button>
                     <button onClick={() => removeBlock(dayIndex, blockIndex)} className="text-gray-800 hover:text-red-500 transition-colors p-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </div>
                </div>
              ))}
               <button onClick={() => addBlock(dayIndex)} className="w-full border-2 border-dashed border-white/5 hover:border-white/10 py-10 rounded-[2rem] text-gray-700 hover:text-gray-500 font-black text-[10px] uppercase tracking-[0.5em] transition-all">+ Add Film Block</button>
            </div>
          </div>
        ))}
      </div>

      {editingBlock !== null && (
        <MovieSelectorModal
          allMovies={Object.values(allMovies)}
          initialSelectedKeys={data[editingBlock.dayIndex].blocks[editingBlock.blockIndex].movieKeys}
          onSave={(newKeys) => handleMovieSelectionSave(editingBlock.dayIndex, editingBlock.blockIndex, newKeys)}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};

export default FestivalEditor;