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
    .filter(movie => (movie.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

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
  const [isDirty, setIsDirty] = useState(false);
  const dirtyTimeout = useRef<any>(null);
  
  const [holidaySettings, setHolidaySettings] = useState<SiteSettings>({
      isHolidayModeActive: settings.isHolidayModeActive || false,
      holidayName: settings.holidayName || 'Cratemas',
      holidayTagline: settings.holidayTagline || 'Our curated collection of holiday stories.',
      holidayTheme: settings.holidayTheme || 'christmas'
  });

  // PREVENT "TOGGLE FLIPPING": Only update from incoming props if we aren't mid-edit
  useEffect(() => {
    if (!isSaving && !isDirty) {
        setHolidaySettings({
            isHolidayModeActive: settings.isHolidayModeActive || false,
            holidayName: settings.holidayName || 'Cratemas',
            holidayTagline: settings.holidayTagline || 'Our curated collection of holiday stories.',
            holidayTheme: settings.holidayTheme || 'christmas'
        });
    }
  }, [settings, isSaving, isDirty]);

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
  };

  const handleHolidaySettingChange = (field: keyof SiteSettings, value: any) => {
      setIsDirty(true);
      setHolidaySettings(prev => ({ ...prev, [field]: value }));
      
      // Auto-clear dirty flag after a long pause if no save happened
      if (dirtyTimeout.current) clearTimeout(dirtyTimeout.current);
      dirtyTimeout.current = setTimeout(() => setIsDirty(false), 15000);
  };

  const saveHolidaySettings = async () => {
    const password = sessionStorage.getItem('adminPassword');
    try {
        const res = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, type: 'settings', data: holidaySettings }),
        });
        if (res.ok) {
            setIsDirty(false);
            alert("Holiday configuration deployed!");
        }
    } catch (err) {
        alert("Sync failed. Check connection.");
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-gradient-to-br from-indigo-900/20 via-gray-900 to-black border border-indigo-500/20 p-8 rounded-[2rem] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                  <h3 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter">Seasonal Engine</h3>
                  <p className="text-gray-400 text-sm mt-1">Configure the specialized holiday row visibility and branding.</p>
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Active State</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={holidaySettings.isHolidayModeActive} 
                        onChange={(e) => handleHolidaySettingChange('isHolidayModeActive', e.target.checked)} 
                        className="sr-only peer" 
                    />
                    <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                  <div>
                      <label className="form-label">Row Label</label>
                      <input 
                        type="text" 
                        value={holidaySettings.holidayName}
                        onChange={(e) => handleHolidaySettingChange('holidayName', e.target.value)}
                        placeholder="e.g. Cratemas"
                        className="form-input !bg-black/40"
                      />
                  </div>
                  <div>
                      <label className="form-label">Promotional Tagline</label>
                      <textarea 
                        value={holidaySettings.holidayTagline}
                        onChange={(e) => handleHolidaySettingChange('holidayTagline', e.target.value)}
                        rows={3}
                        className="form-input !bg-black/40"
                      />
                  </div>
              </div>

              <div className="space-y-6">
                   <div>
                      <label className="form-label">Atmospheric Theme</label>
                      <select 
                        value={holidaySettings.holidayTheme}
                        onChange={(e) => handleHolidaySettingChange('holidayTheme', e.target.value)}
                        className="form-input !bg-black/40"
                      >
                          <option value="christmas">Christmas (Green/Red)</option>
                          <option value="valentines">Valentine's (Pink/Deep Red)</option>
                          <option value="gold">Gold Anniversary (Black/Gold)</option>
                          <option value="generic">Modern Dark (Neutral)</option>
                      </select>
                  </div>
                  
                  <button 
                    onClick={saveHolidaySettings}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95"
                  >
                      Deploy Seasonal Parameters
                  </button>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center mb-6 pt-4 border-t border-white/5">
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Permanent Categories</h2>
        <button onClick={addNewCategory} className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-widest">+ Create Row</button>
      </div>

      <div className="space-y-4">
        {Object.entries(categories).map(([key, category]: [string, Category]) => {
          // Hide Cratemas entry from the category list if mode is off to prevent confusion
          if (key === 'cratemas' && !holidaySettings.isHolidayModeActive && !isDirty) return null;
          
          return (
            <div key={key} className={`bg-gray-900 border border-white/5 p-6 rounded-2xl`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex-grow">
                    <label className="text-[9px] uppercase font-black text-gray-600 mb-2 block tracking-widest">Internal ID: {key}</label>
                    <input
                        type="text"
                        value={category.title}
                        onChange={e => handleCategoryChange(key, 'title', e.target.value)}
                        className="text-lg font-black bg-transparent text-white focus:outline-none focus:bg-white/5 rounded-lg px-3 py-2 w-full border border-transparent focus:border-white/10"
                    />
                </div>
                <button onClick={() => deleteCategory(key)} className="text-[10px] text-red-500 hover:text-red-400 ml-4 font-black uppercase tracking-widest">Delete</button>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{category.movieKeys.length} Assets Attached</p>
                  <button onClick={() => setEditingCategoryKey(key)} className="bg-white/10 hover:bg-white/20 text-white font-black py-2 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all">Assign Content</button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/5">
        <button onClick={() => onSave(categories)} disabled={isSaving} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest shadow-2xl transition-all">
            {isSaving ? 'Syncing Base Catalog...' : 'Commit Category Changes'}
        </button>
      </div>

      {editingCategoryKey && (
        <MovieSelectorModal allMovies={allMovies} initialSelectedKeys={categories[editingCategoryKey].movieKeys} onSave={(newKeys) => handleMovieSelectionSave(editingCategoryKey, newKeys)} onClose={() => setEditingCategoryKey(null)} />
      )}
    </div>
  );
};

export default CategoryEditor;