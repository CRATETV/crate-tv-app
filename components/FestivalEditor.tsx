import React, { useState } from 'react';
import { Movie, FestivalDay, FestivalConfig } from '../types';

interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
}

// The MovieSelectorModal component for selecting films within a block
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
    .filter(movie => movie.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title));

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
}

// The FestivalEditor component for managing festival data
const FestivalEditor: React.FC<FestivalEditorProps> = ({ data, config, allMovies, onDataChange, onConfigChange, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);

  const handleDayChange = (dayIndex: number, field: keyof FestivalDay, value: string) => {
    const newData = data.map((day, index) => 
      index === dayIndex ? { ...day, [field]: value } : day
    );
    onDataChange(newData);
  };
  
  const handleBlockChange = (dayIndex: number, blockIndex: number, field: string, value: string) => {
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
    const { name, value } = e.target;
    onConfigChange({ ...config, [name]: value });
  };
  
  const addDay = () => {
    const newDay: FestivalDay = {
      day: data.length + 1,
      date: `New Day Date`,
      blocks: [],
    };
    onDataChange([...data, newDay]);
  };

  const removeDay = (dayIndex: number) => {
    const newData = data
      .filter((_, i) => i !== dayIndex)
      .map((day, index) => ({ ...day, day: index + 1 }));
    onDataChange(newData);
  };
  
  const addBlock = (dayIndex: number) => {
    const newBlock = {
      id: `day${dayIndex + 1}-block${Date.now()}`,
      title: 'New Film Block',
      time: 'TBD',
      movieKeys: [],
    };
    const newData = data.map((day, index) => {
      if (index === dayIndex) {
        return { ...day, blocks: [...day.blocks, newBlock] };
      }
      return day;
    });
    onDataChange(newData);
  };
  
  const removeBlock = (dayIndex: number, blockIndex: number) => {
     const newData = data.map((day, index) => {
        if (index === dayIndex) {
          return { ...day, blocks: day.blocks.filter((_, i) => i !== blockIndex) };
        }
        return day;
      });
      onDataChange(newData);
  };

  const handleSave = () => {
    setIsSaving(true);
    onSave();
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 500);
  };
  
  if (!config) {
    return (
      <div className="bg-gray-950 p-6 rounded-lg text-center">
        <p className="text-gray-400">Loading festival configuration...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 p-6 rounded-lg text-gray-200">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-purple-400">Film Festival Editor</h2>
      
      <div className="space-y-4 mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
          <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300">Festival Title</label>
              <input 
                type="text" 
                name="title" 
                value={config.title || ''} 
                onChange={handleConfigChange} 
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" 
              />
          </div>
          <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Festival Description</label>
              <textarea 
                name="description" 
                value={config.description || ''} 
                onChange={handleConfigChange} 
                rows={3} 
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              ></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date & Time</label>
              <input type="datetime-local" name="startDate" value={config.startDate || ''} onChange={handleConfigChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">End Date & Time</label>
              <input type="datetime-local" name="endDate" value={config.endDate || ''} onChange={handleConfigChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>
      </div>

      <div className="space-y-6">
        {data.map((day, dayIndex) => (
          <div key={day.day} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
              <h3 className="text-xl font-bold text-white">Day {day.day}</h3>
              <button onClick={() => removeDay(dayIndex)} className="text-xs text-red-500 hover:text-red-400 self-end sm:self-center">Remove Day</button>
            </div>
            <input
              type="text"
              value={day.date}
              onChange={e => handleDayChange(dayIndex, 'date', e.target.value)}
              className="w-full mb-4 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
            />
            <div className="space-y-4 pl-4 border-l-2 border-gray-600">
              {day.blocks.map((block, blockIndex) => (
                <div key={block.id} className="bg-gray-800 p-3 rounded-md">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <input
                            type="text"
                            value={block.title}
                            onChange={e => handleBlockChange(dayIndex, blockIndex, 'title', e.target.value)}
                            placeholder="Block Title"
                            className="w-full text-lg font-semibold bg-transparent text-white focus:outline-none focus:bg-gray-700 rounded-md px-2"
                        />
                         <input
                            type="text"
                            value={block.time}
                            onChange={e => handleBlockChange(dayIndex, blockIndex, 'time', e.target.value)}
                            placeholder="e.g., 7:00 PM EST"
                            className="w-full text-sm font-normal bg-transparent text-gray-300 focus:outline-none focus:bg-gray-700 rounded-md px-2"
                        />
                   </div>
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-xs text-gray-400 mb-2">{block.movieKeys.length} film(s) selected.</p>
                       <button onClick={() => setEditingBlock({ dayIndex, blockIndex })} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">
                         Edit Films
                       </button>
                     </div>
                     <button onClick={() => removeBlock(dayIndex, blockIndex)} className="text-xs text-red-500 hover:text-red-400 self-end sm:self-center flex-shrink-0">Remove Block</button>
                   </div>
                </div>
              ))}
               <button onClick={() => addBlock(dayIndex)} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md mt-4">
                 + Add Block
               </button>
            </div>
          </div>
        ))}
        <button onClick={addDay} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
          + Add Day
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-700">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-5 rounded-md transition-colors"
        >
          {isSaving ? 'Saving...' : (showSuccess ? 'Saved Successfully!' : 'Save Festival Settings')}
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