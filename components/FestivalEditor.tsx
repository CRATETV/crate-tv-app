
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

const formatISOForInput = (isoString?: string): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
        return '';
    }
};

const FestivalEditor: React.FC<FestivalEditorProps> = ({ data, config, allMovies, onDataChange, onConfigChange, onSave, isSaving }) => {
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);

  const handleDayChange = (dayIndex: number, field: keyof FestivalDay, value: string) => {
    const newData = data.map((day, index) => 
      index === dayIndex ? { ...day, [field]: value } : day
    );
    onDataChange(newData);
  };
  
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
        finalValue = value ? new Date(value).toISOString() : '';
    }
    onConfigChange({ ...config, [name]: finalValue });
  };
  
  const addDay = () => {
    onDataChange([...data, { day: data.length + 1, date: `New Day Date`, blocks: [] }]);
  };

  const addBlock = (dayIndex: number) => {
    const newBlock: FilmBlock = {
      id: `day${dayIndex + 1}-block${Date.now()}`,
      title: 'New Film Block',
      time: 'TBD',
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
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-400">Film Festival Editor</h2>
      
      <div className="space-y-4 mb-6 bg-gray-900/50 p-6 rounded-[2rem] border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Global Festival Manifest</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="form-label">Festival Title</label>
                  <input type="text" name="title" value={config.title || ''} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-500">Active Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="isFestivalLive" checked={config.isFestivalLive} onChange={(e) => onConfigChange({...config, isFestivalLive: e.target.checked})} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
              <div className="md:col-span-2">
                  <label className="form-label">Mission Brief</label>
                  <textarea name="description" value={config.description || ''} onChange={handleConfigChange} rows={3} className="form-input bg-black/40" />
              </div>
              <div>
                  <label className="form-label">Uplink Visibility Start (Banner Open)</label>
                  <input type="datetime-local" name="startDate" value={formatISOForInput(config.startDate)} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
              <div>
                  <label className="form-label">Uplink Visibility End (Banner Close)</label>
                  <input type="datetime-local" name="endDate" value={formatISOForInput(config.endDate)} onChange={handleConfigChange} className="form-input bg-black/40" />
              </div>
          </div>
      </div>

      <div className="space-y-6">
        {data.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Day {day.day}</h3>
            <div className="space-y-4">
              {day.blocks.map((block, blockIndex) => (
                <div key={blockIndex} className="bg-gray-800 p-4 rounded-md space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={block.title} onChange={e => handleBlockChange(dayIndex, blockIndex, 'title', e.target.value)} placeholder="Block Title" className="bg-transparent text-white font-bold border-b border-white/10" />
                        <input value={block.time} onChange={e => handleBlockChange(dayIndex, blockIndex, 'time', e.target.value)} placeholder="Time (e.g. 7pm)" className="bg-transparent text-gray-400 border-b border-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-black">PRICE $</span>
                            <input type="number" value={block.price} onChange={e => handleBlockChange(dayIndex, blockIndex, 'price', parseFloat(e.target.value))} className="bg-transparent text-green-500 font-bold w-20 border-b border-white/10" />
                        </div>
                   </div>
                   <div className="flex justify-between items-center">
                     <button onClick={() => setEditingBlock({ dayIndex, blockIndex })} className="text-xs bg-blue-600 px-3 py-1 rounded">Select Films ({block.movieKeys.length})</button>
                     <button onClick={() => removeBlock(dayIndex, blockIndex)} className="text-xs text-red-500">Remove Block</button>
                   </div>
                </div>
              ))}
               <button onClick={() => addBlock(dayIndex)} className="text-sm bg-gray-700 px-4 py-2 rounded">+ Add Block</button>
            </div>
          </div>
        ))}
        <button onClick={addDay} className="bg-purple-600 px-6 py-2 rounded font-bold">Add Day</button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <button onClick={onSave} disabled={isSaving} className="bg-red-600 px-10 py-3 rounded-xl font-black uppercase tracking-widest">{isSaving ? 'Publishing...' : 'Save Festival Manifest'}</button>
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
