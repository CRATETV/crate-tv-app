import React, { useState, useEffect, useRef } from 'react';
import { Category, Movie, SiteSettings } from '../types';
import { useFestival } from '../contexts/FestivalContext';

interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
}

const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({ allMovies, initialSelectedKeys, onSave, onClose }) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set(initialSelectedKeys));
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
          <h3 className="text-xl font-bold text-white">Select Films for Category</h3>
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


interface CategoryEditorProps {
  initialCategories: Record<string, Category>;
  allMovies: Movie[];
  onSave: (newCategories: Record<string, Category>) => void;
  isSaving: boolean;
}

const CategoryEditor: React.FC<CategoryEditorProps> = ({ initialCategories, allMovies, onSave, isSaving }) => {
  const { settings } = useFestival();
  const [categories, setCategories] = useState<Record<string, Category>>(initialCategories);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');
  const [isHolidayMode, setIsHolidayMode] = useState(settings.isHolidayModeActive || false);
  const prevIsSaving = useRef(isSaving);

  useEffect(() => {
    setIsHolidayMode(settings.isHolidayModeActive || false);
  }, [settings.isHolidayModeActive]);

  useEffect(() => {
    if (prevIsSaving.current === true && isSaving === false) {
       setCategories(initialCategories);
    } else if (!isSaving && Object.keys(categories).length === 0) {
       setCategories(initialCategories);
    }
    prevIsSaving.current = isSaving;
  }, [initialCategories, isSaving]);

  const handleCategoryChange = (key: string, field: 'title', value: string) => {
    setCategories(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleMovieSelectionSave = (categoryKey: string, newMovieKeys: string[]) => {
    setCategories(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], movieKeys: newMovieKeys },
    }));
    setEditingCategoryKey(null);
  };

  const addNewCategory = () => {
    const newKey = `custom_${Date.now()}`;
    const newCategory: Category = { title: 'New Category Title', movieKeys: [] };
    setCategories(prev => ({ [newKey]: newCategory, ...prev }));
  };

  const deleteCategory = async (key: string) => {
    const categoryTitle = categories[key]?.title || 'this category';
    if (!window.confirm(`Are you sure you want to permanently delete "${categoryTitle}"?`)) return;

    setCategories(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
    });

    if (!key.startsWith('custom_')) {
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type: 'delete_category', data: { key } }),
            });
            if (!response.ok) throw new Error('Failed to delete from database.');
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Deletion failed.');
            setCategories(initialCategories);
        }
    }
  };

  const toggleHolidayMode = async (active: boolean) => {
    setIsHolidayMode(active);
    const password = sessionStorage.getItem('adminPassword');
    try {
        await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, type: 'settings', data: { isHolidayModeActive: active } }),
        });
    } catch (err) {
        console.error("Failed to update holiday mode:", err);
    }
  };

  return (
    <div>
      <div className="mb-10 p-6 bg-red-900/10 border border-red-500/20 rounded-xl flex items-center justify-between">
          <div>
              <h3 className="text-xl font-bold text-red-400 uppercase tracking-tighter">Holiday Season Master Switch</h3>
              <p className="text-gray-400 text-sm mt-1">Globally toggle the Cratemas row visibility on the homepage (Great for Christmas in July!)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isHolidayMode} onChange={(e) => toggleHolidayMode(e.target.checked)} className="sr-only peer" />
            <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-300">Film Categories</h2>
        <button onClick={addNewCategory} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-transform hover:scale-105">+ Add New Category</button>
      </div>

      {localError && <div className="p-3 mb-4 bg-red-900/50 border border-red-700 text-red-200 rounded-md text-sm">{localError}</div>}

      <div className="space-y-4">
        {Object.entries(categories).map(([key, category]: [string, Category]) => (
          <div key={key} className={`bg-gray-800 p-4 rounded-lg border transition-all duration-300 ${key.startsWith('custom_') ? 'border-purple-500 shadow-lg shadow-purple-900/20' : 'border-gray-700'}`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex-grow">
                  <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Category Title</label>
                  <input
                    type="text"
                    value={category.title}
                    onChange={e => handleCategoryChange(key, 'title', e.target.value)}
                    placeholder="Enter category name..."
                    className="text-lg font-semibold bg-transparent text-white focus:outline-none focus:bg-gray-700 rounded-md px-2 w-full border border-transparent focus:border-gray-600"
                  />
              </div>
              <button onClick={() => deleteCategory(key)} className="text-xs text-red-500 hover:text-red-400 ml-4 font-bold uppercase tracking-wider">Delete</button>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
                <p className="text-xs text-gray-400"><strong className="text-gray-300">{category.movieKeys.length}</strong> film(s) currently assigned</p>
                <button onClick={() => setEditingCategoryKey(key)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1.5 px-4 rounded-md text-xs transition-colors">Manage Assigned Films</button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-700">
        <button onClick={() => onSave(categories)} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg">{isSaving ? 'Publishing...' : 'Save & Publish Categories'}</button>
      </div>

      {editingCategoryKey && (
        // FIX: The onClose prop was incorrectly calling setEditingBlock(null). This has been corrected to setEditingCategoryKey(null) to match the component's state variables.
        <MovieSelectorModal allMovies={allMovies} initialSelectedKeys={categories[editingCategoryKey].movieKeys} onSave={(newKeys) => handleMovieSelectionSave(editingCategoryKey, newKeys)} onClose={() => setEditingCategoryKey(null)} />
      )}
    </div>
  );
};

export default CategoryEditor;