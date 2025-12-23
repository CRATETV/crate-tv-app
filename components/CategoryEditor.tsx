
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
  
  // Holiday Settings State
  const [holidaySettings, setHolidaySettings] = useState<SiteSettings>({
      isHolidayModeActive: settings.isHolidayModeActive || false,
      holidayName: settings.holidayName || 'Cratemas',
      holidayTagline: settings.holidayTagline || 'Our curated collection of holiday stories, independent spirit, and cinematic cheer.',
      holidayTheme: settings.holidayTheme || 'christmas'
  });

  const prevIsSaving = useRef(isSaving);

  useEffect(() => {
    setHolidaySettings({
        isHolidayModeActive: settings.isHolidayModeActive || false,
        holidayName: settings.holidayName || 'Cratemas',
        holidayTagline: settings.holidayTagline || 'Our curated collection of holiday stories, independent spirit, and cinematic cheer.',
        holidayTheme: settings.holidayTheme || 'christmas'
    });
  }, [settings]);

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

  const handleHolidaySettingChange = (field: keyof SiteSettings, value: any) => {
      setHolidaySettings(prev => ({ ...prev, [field]: value }));
  };

  const saveHolidaySettings = async () => {
    const password = sessionStorage.getItem('adminPassword');
    try {
        await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, type: 'settings', data: holidaySettings }),
        });
        alert("Holiday settings updated successfully!");
    } catch (err) {
        console.error("Failed to update holiday settings:", err);
        alert("Failed to save holiday settings.");
    }
  };

  return (
    <div className="space-y-10">
      {/* Dynamic Holiday Brand Manager */}
      <div className="bg-gradient-to-br from-indigo-900/20 via-gray-900 to-black border border-indigo-500/20 p-8 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                  <h3 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter">Holiday Brand Manager</h3>
                  <p className="text-gray-400 text-sm mt-1">Customize your platform's special seasonal collection branding.</p>
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                <span className="text-sm font-bold text-gray-400">Active?</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={holidaySettings.isHolidayModeActive} 
                        onChange={(e) => handleHolidaySettingChange('isHolidayModeActive', e.target.checked)} 
                        className="sr-only peer" 
                    />
                    <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                  <div>
                      <label className="form-label">Special Event Name</label>
                      <input 
                        type="text" 
                        value={holidaySettings.holidayName}
                        onChange={(e) => handleHolidaySettingChange('holidayName', e.target.value)}
                        placeholder="e.g. Cratemas, Love Stories, Scares"
                        className="form-input"
                      />
                  </div>
                  <div>
                      <label className="form-label">Tagline / Description</label>
                      <textarea 
                        value={holidaySettings.holidayTagline}
                        onChange={(e) => handleHolidaySettingChange('holidayTagline', e.target.value)}
                        rows={3}
                        className="form-input"
                        placeholder="Explain the collection to your viewers..."
                      />
                  </div>
              </div>

              <div className="space-y-6">
                   <div>
                      <label className="form-label">Visual Theme</label>
                      <select 
                        value={holidaySettings.holidayTheme}
                        onChange={(e) => handleHolidaySettingChange('holidayTheme', e.target.value)}
                        className="form-input"
                      >
                          <option value="christmas">Christmas (Green/Red/Snow)</option>
                          <option value="valentines">Valentine's (Pink/Rose/Hearts)</option>
                          <option value="gold">Gold & Black (Awards/Anniversary)</option>
                          <option value="generic">Generic Brand (Clean Dark)</option>
                      </select>
                  </div>
                  
                  <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      <p className="text-xs text-indigo-300 leading-relaxed italic">
                        <strong>Pro-Tip:</strong> Changing the theme updates animations and color accents across the home feed row and the collection page instantly.
                      </p>
                  </div>

                  <button 
                    onClick={saveHolidaySettings}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-900/40 active:scale-95"
                  >
                      Publish Holiday Brand Update
                  </button>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center mb-6 pt-4 border-t border-gray-800">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-300">Other Film Categories</h2>
        <button onClick={addNewCategory} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-transform hover:scale-105">+ Add New Category</button>
      </div>

      {localError && <div className="p-3 mb-4 bg-red-900/50 border border-red-700 text-red-200 rounded-md text-sm">{localError}</div>}

      <div className="space-y-4">
        {Object.entries(categories).map(([key, category]: [string, Category]) => {
          if (key === 'cratemas' || (category.title && category.title.toLowerCase() === 'cratemas')) return null;
          
          return (
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
          );
        })}
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-700">
        <button onClick={() => onSave(categories)} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg">{isSaving ? 'Publishing...' : 'Save & Publish All Categories'}</button>
      </div>

      {editingCategoryKey && (
        <MovieSelectorModal allMovies={allMovies} initialSelectedKeys={categories[editingCategoryKey].movieKeys} onSave={(newKeys) => handleMovieSelectionSave(editingCategoryKey, newKeys)} onClose={() => setEditingCategoryKey(null)} />
      )}
    </div>
  );
};

export default CategoryEditor;
