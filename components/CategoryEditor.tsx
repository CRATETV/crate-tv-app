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
    if (newSelection.has(key)) newSelection.delete(key);
    else newSelection.add(key);
    setSelectedKeys(newSelection);
  };

  const handleSave = () => onSave(Array.from(selectedKeys));

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
  
  const [holidaySettings, setHolidaySettings] = useState<SiteSettings>({
      isHolidayModeActive: settings.isHolidayModeActive || false,
      holidayName: settings.holidayName || 'Cratemas',
      holidayTagline: settings.holidayTagline || '',
      holidayTheme: settings.holidayTheme || 'generic'
  });

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    if (!isSaving) {
        setHolidaySettings({
            isHolidayModeActive: settings.isHolidayModeActive || false,
            holidayName: settings.holidayName || 'Cratemas',
            holidayTagline: settings.holidayTagline || '',
            holidayTheme: settings.holidayTheme || 'generic'
        });
    }
  }, [settings, isSaving]);

  const handleCategoryChange = (key: string, field: 'title', value: string) => {
    setCategories(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleMovieSelectionSave = (categoryKey: string, newMovieKeys: string[]) => {
    setCategories(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], movieKeys: newMovieKeys } }));
    setEditingCategoryKey(null);
  };

  const deleteCategory = async (key: string) => {
    if (!window.confirm(`PERMANENT ACTION: Erase row "${categories[key]?.title}"?`)) return;
    const newCats = { ...categories };
    delete newCats[key];
    setCategories(newCats);
    // CRITICAL: We pass true to indicate a full overwrite in the API
    onSave(newCats);
  };

  const handleHolidayToggle = async (active: boolean) => {
      const nextSettings = { ...holidaySettings, isHolidayModeActive: active };
      setHolidaySettings(nextSettings);
      
      const password = sessionStorage.getItem('adminPassword');
      try {
          await fetch('/api/publish-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password, type: 'settings', data: nextSettings }),
          });
      } catch (err) {
          console.error("Toggle sync failed.");
      }
  };

  const saveHolidayDetails = async () => {
    const password = sessionStorage.getItem('adminPassword');
    try {
        const res = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, type: 'settings', data: holidaySettings }),
        });
        if (res.ok) alert("Holiday profile updated.");
    } catch (err) {
        alert("Sync failed.");
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-gray-900 border border-indigo-500/20 p-8 rounded-[2rem] shadow-xl">
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
              <div>
                  <h3 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter">Holiday Hub</h3>
                  <p className="text-gray-400 text-sm">Control the seasonal row visibility and metadata.</p>
              </div>
              <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-500">Live State</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={holidaySettings.isHolidayModeActive} onChange={(e) => handleHolidayToggle(e.target.checked)} className="sr-only peer" />
                    <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                  <input type="text" value={holidaySettings.holidayName} onChange={(e) => setHolidaySettings({...holidaySettings, holidayName: e.target.value})} placeholder="Holiday Name" className="form-input !bg-black/40" />
                  <textarea value={holidaySettings.holidayTagline} onChange={(e) => setHolidaySettings({...holidaySettings, holidayTagline: e.target.value})} placeholder="Tagline" className="form-input !bg-black/40" rows={2} />
              </div>
              <div className="space-y-4">
                  <select value={holidaySettings.holidayTheme} onChange={(e) => setHolidaySettings({...holidaySettings, holidayTheme: e.target.value as any})} className="form-input !bg-black/40">
                      <option value="christmas">Christmas</option>
                      <option value="valentines">Valentine's</option>
                      <option value="gold">Anniversary Gold</option>
                      <option value="generic">Neutral Dark</option>
                  </select>
                  <button onClick={saveHolidayDetails} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl shadow-lg transition-all">Update Holiday Profile</button>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center mb-6 pt-4 border-t border-white/5">
        <h2 className="text-xl font-black text-white uppercase tracking-widest">Base Rows</h2>
        <button onClick={() => setCategories({ [`row_${Date.now()}`]: { title: 'New Row', movieKeys: [] }, ...categories })} className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-4 rounded-xl text-[10px] uppercase tracking-widest">+ New Row</button>
      </div>

      <div className="space-y-4">
        {Object.entries(categories).map(([key, category]) => {
          // FIX: Explicitly cast category to Category to resolve properties on unknown type.
          const cat = category as Category;
          if (key === 'featured' || key === 'nowStreaming') return null;
          return (
            <div key={key} className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-grow">
                    <input type="text" value={cat.title} onChange={e => handleCategoryChange(key, 'title', e.target.value)} className="text-lg font-bold bg-transparent text-white focus:outline-none w-full border-b border-transparent focus:border-white/10" />
                    <p className="text-[10px] text-gray-600 uppercase font-black mt-2 tracking-widest">{cat.movieKeys.length} Records Linked</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setEditingCategoryKey(key)} className="bg-white/5 hover:bg-white/10 text-white font-black py-2 px-6 rounded-lg text-[9px] uppercase tracking-widest border border-white/5 transition-all">Select Content</button>
                    <button onClick={() => deleteCategory(key)} className="text-red-500 hover:text-red-400 font-black text-[9px] uppercase tracking-widest ml-4">Erase Row</button>
                </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 pt-6 border-t border-white/5">
        <button onClick={() => onSave(categories)} disabled={isSaving} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-black py-4 px-10 rounded-2xl uppercase tracking-widest shadow-2xl transition-all">
            {isSaving ? 'Syncing...' : 'Commit Category Map'}
        </button>
      </div>

      {editingCategoryKey && (
        <MovieSelectorModal allMovies={allMovies} initialSelectedKeys={categories[editingCategoryKey].movieKeys} onSave={(newKeys) => handleMovieSelectionSave(editingCategoryKey, newKeys)} onClose={() => setEditingCategoryKey(null)} />
      )}
    </div>
  );
};

export default CategoryEditor;