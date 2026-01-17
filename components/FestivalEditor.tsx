
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col border border-gray-600" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-white">Select Films</h3>
          <input
            type="text"
            placeholder="Search films..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500"
          />
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {filteredMovies.map(movie => (
              <label key={movie.key} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(movie.key)}
                  onChange={() => toggleSelection(movie.key)}
                  className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-200">{movie.title}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end gap-4">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">Save Selection</button>
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

/**
 * STRATEGIC DATE CONVERSION CORE
 * Prevents the "Dec 31" bug by correctly accounting for local offsets.
 */
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

  const handleBlockChange = (dayIndex: number, blockIndex: number, field: string, value: any) => {
    const newData = data.map((day, i) => {
        if (i === dayIndex) {
          const updatedBlocks = day.blocks.map((block, j) => {
            if (j === blockIndex) {
              return { ...block, [field]: value };
            }
            return block;
          });
          return { ...day, blocks: updatedBlocks };
        }
        return day;
    });
    onDataChange(newData);
  };
  
  const handleMovieSelectionSave = (dayIndex: number, blockIndex: number, newMovieKeys: string[]) => {
    const newData = data.map((day, i) => {
      if (i === dayIndex) {
        const updatedBlocks = day.blocks.map((block, j) => {
          if (j === blockIndex) {
            return { ...block, movieKeys: newMovieKeys };
          }
          return block;
        });
        return { ...day, blocks: updatedBlocks };
      }
      return day;
    });
    onDataChange(newData);
    setEditingBlock(null);
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    if (type === 'datetime-local') {
        // Correctly handle UTC persistence
        finalValue = value ? new Date(value).toISOString() : '';
    } else if (type === 'checkbox') {
        finalValue = (e.target as HTMLInputElement).checked;
    }
    
    onConfigChange({ ...config, [name]: finalValue });
  };
  
  const addDay = () => {
    onDataChange([...data, { day: data.length + 1, date: `Day ${data.length + 1}`, blocks: [] }]);
  };

  const addBlock = (dayIndex: number) => {
    const newBlock: FilmBlock = {
      id: `day${dayIndex + 1}-block${Date.now()}`,
      title: 'New Film Block',
      time: '7:00 PM',
      movieKeys: [],
      price: 10.00
    };
    const newData = data.map((day, index) => index === dayIndex ? { ...day, blocks: [...day.blocks, newBlock] } : day);
    onDataChange(newData);
  };
  
  const removeBlock = (dayIndex: number, blockIndex: number) => {
     const newData = data.map((day, index) => index === dayIndex ? { ...day, blocks: day.blocks.filter((_, i) => i !== blockIndex) } : day);
      onDataChange(newData);
  };

  return (
    <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-400 italic uppercase tracking-tighter">Annual Festival Manager</h2>
      
      <div className="space-y-6 mb-12 bg-gray-900/50 p-8 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Global Visibility window</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                  <label className="form-label">Festival Title</label>
                  <input type="text" name="title" value={config.title || ''} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
              <div>
                  <label className="form-label">Homepage Uplink Start (Visible)</label>
                  <input type="datetime-local" name="startDate" value={formatISOForInput(config.startDate)} onChange={handleConfigChange} className="form-input bg-black/40 border-white/10" />
              </div>
              <div>
                  <label className="form-label">Homepage Uplink End (Hidden)</label>
                  <input type="datetime-local" name="endDate" value={formatISOForInput(config.endDate)} onChange={handleConfigChange} className="form-input bg-black/40 border-white/10" />
              </div>
              <div className="flex items-center gap-4 bg-black/20 p-5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">LIVE STATUS</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="isFestivalLive" checked={config.isFestivalLive} onChange={(e) => onConfigChange({...config, isFestivalLive: e.target.checked})} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
              <div className="md:col-span-2">
                  <label className="form-label">Mission Brief</label>
                  <textarea name="description" value={config.description || ''} onChange={handleConfigChange} rows={3} className="form-input bg-black/40" placeholder="Celebrating the bold and the unique..." />
              </div>
          </div>
      </div>

      <div className="space-y-8">
        <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-black uppercase italic tracking-widest">Programming Schedule</h3>
            <button onClick={addDay} className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all">+ Add Festival Day</button>
        </div>

        {data.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-8">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <span className="text-4xl font-black italic tracking-tighter text-red-600">0{day.day}</span>
                <input value={day.date} onChange={e => {
                    const newData = [...data];
                    newData[dayIndex].date = e.target.value;
                    onDataChange(newData);
                }} className="bg-transparent text-white font-black text-2xl uppercase tracking-tighter outline-none" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {day.blocks.map((block, blockIndex) => (
                <div key={blockIndex} className="bg-black/60 p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 group">
                   <div className="flex-grow space-y-1">
                        <input value={block.title} onChange={e => handleBlockChange(dayIndex, blockIndex, 'title', e.target.value)} className="bg-transparent text-white font-bold text-lg uppercase tracking-tight outline-none" placeholder="Block Title" />
                        <div className="flex gap-4 items-center">
                            <input value={block.time} onChange={e => handleBlockChange(dayIndex, blockIndex, 'time', e.target.value)} className="bg-transparent text-gray-500 text-[10px] font-black uppercase tracking-widest outline-none border-b border-transparent focus:border-white/10" placeholder="7:00 PM" />
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] text-gray-700 font-black">PRICE $</span>
                                <input type="number" value={block.price} onChange={e => handleBlockChange(dayIndex, blockIndex, 'price', parseFloat(e.target.value))} className="bg-transparent text-green-500 font-bold w-16 text-sm outline-none" />
                            </div>
                        </div>
                   </div>
                   <div className="flex items-center gap-4">
                     <button onClick={() => setEditingBlock({ dayIndex, blockIndex })} className="bg-white text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Films ({block.movieKeys.length})</button>
                     <button onClick={() => removeBlock(dayIndex, blockIndex)} className="text-gray-700 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                   </div>
                </div>
              ))}
               <button onClick={() => addBlock(dayIndex)} className="w-full border-2 border-dashed border-white/5 hover:border-white/10 py-4 rounded-3xl text-gray-600 hover:text-gray-400 font-black text-[10px] uppercase tracking-[0.4em] transition-all">+ Add Selection Block</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 pt-12 border-t border-white/5 flex justify-center">
        <button onClick={onSave} disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-2xl transition-all transform active:scale-95 disabled:opacity-20 text-sm">
            {isSaving ? 'Synchronizing Cluster...' : 'Publish Global Manifest'}
        </button>
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
