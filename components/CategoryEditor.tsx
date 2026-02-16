
import React, { useState, useEffect, useMemo } from 'react';
import { Category, Movie, SiteSettings } from '../types';
import { useFestival } from '../contexts/FestivalContext';

interface MovieSelectorModalProps {
  allMovies: Movie[];
  initialSelectedKeys: string[];
  excludedKeys?: string[]; // Keys to hide from the list
  onSave: (newMovieKeys: string[]) => void;
  onClose: () => void;
  title?: string;
}

const MovieSelectorModal: React.FC<MovieSelectorModalProps> = ({ allMovies, initialSelectedKeys, excludedKeys = [], onSave, onClose, title = "Select Films" }) => {
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
    .filter(movie => {
        // FIXED: Allow admin to see all movies regardless of exclusion to enable multi-row placement (e.g. Just Cuz in Comedy).
        const matchesSearch = (movie.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    })
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
      <div className="bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-white/5">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{title}</h3>
          <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-1">Filtering {filteredMovies.length} Available Nodes</p>
          <input
            type="text"
            placeholder="Scan catalog..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full mt-6 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-600 transition-all text-sm"
          />
        </div>
        <div className="p-6 overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            {filteredMovies.map(movie => (
              <label key={movie.key} className={`flex items-center space-x-4 p-4 rounded-2xl transition-all border cursor-pointer ${selectedKeys.has(movie.key) ? 'bg-red-600/10 border-red-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(movie.key)}
                  onChange={() => toggleSelection(movie.key)}
                  className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500"
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
        </div>
        <div className="p-8 border-t border-white/5 flex justify-end gap-4">
          <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Abort</button>
          <button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-10 rounded-xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Sync Selections</button>
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
      holidayTheme: settings.holidayTheme || 'generic',
      maintenanceMode: settings.maintenanceMode || false,
      businessEmail: settings.businessEmail || 'studio@cratetv.net',
      technicalEmail: settings.technicalEmail || 'cratetiv@gmail.com',
      emailSignature: settings.emailSignature || "Best,\nThe Crate TV Studio Team"
  });

  useEffect(() => {
    const defaultCats = {
        publicAccess: { title: 'The Square', movieKeys: [] },
        publicDomainIndie: { title: 'Vintage Visions', movieKeys: [] },
        ...initialCategories
    };
    setCategories(defaultCats);
  }, [initialCategories]);

  const handleCategoryChange = (key: string, field: 'title', value: string) => {
    setCategories(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleMovieSelectionSave = (categoryKey: string, newMovieKeys: string[]) => {
    setCategories(prev => ({ ...prev, [categoryKey]: { ...prev[categoryKey], movieKeys: newMovieKeys } }));
    setEditingCategoryKey(null);
  };

  const deleteCategory = async (key: string) => {
    if (!window.confirm(`PERMANENT ACTION: Erase row "${categories[key]?.title}"?`)) return;
    
    const password = sessionStorage.getItem('adminPassword');
    const operatorName = sessionStorage.getItem('operatorName');
    
    try {
        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, operatorName, type: 'delete_category', data: { key } }),
        });
        
        if (!response.ok) throw new Error("API rejection during category purge.");

        const newCats = { ...categories };
        delete newCats[key];
        setCategories(newCats);
        alert("Category record erased from global manifest.");
    } catch (err) {
        console.error(err);
        alert("Erase sequence failed. Check system logs.");
    }
  };

  const handleToggle = async (field: keyof SiteSettings, value: boolean) => {
      const nextSettings = { ...holidaySettings, [field]: value };
      setHolidaySettings(nextSettings);
      const password = sessionStorage.getItem('adminPassword');
      try {
          await fetch('/api/publish-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password, type: 'settings', data: nextSettings }),
          });
      } catch (err) { console.error("Toggle sync failed."); }
  };

  const saveIdentityDetails = async () => {
    const password = sessionStorage.getItem('adminPassword');
    try {
        const res = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, type: 'settings', data: holidaySettings }),
        });
        if (res.ok) alert("Settings updated.");
    } catch (err) { alert("Sync failed."); }
  };

  const PROTECTED_KEYS = ['featured', 'nowStreaming', 'publicAccess', 'publicDomainIndie'];

  return (
    <div className="space-y-16 pb-20">
      {/* Isolated Sector Management */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
             <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Isolated Sector Hubs</h2>
             <span className="text-[8px] font-black bg-emerald-600/20 text-emerald-500 px-2 py-0.5 rounded tracking-widest uppercase">Strict Separation Enabled</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0f0f0f] border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Public Square (The Commons)</h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Managed Grant-Subsidized Civic Wing</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{categories.publicAccess?.movieKeys?.length || 0} Films Managed</p>
                    <button onClick={() => setEditingCategoryKey('publicAccess')} className="bg-emerald-600 text-white font-black px-6 py-2.5 rounded-xl uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Curate Square</button>
                </div>
            </div>

            <div className="bg-[#0f0f0f] border border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
                </div>
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic">Vintage Visions (Classics)</h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">Historical preservation wing</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{categories.publicDomainIndie?.movieKeys?.length || 0} Films Managed</p>
                    <button onClick={() => setEditingCategoryKey('publicDomainIndie')} className="bg-amber-600 text-white font-black px-6 py-2.5 rounded-xl uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">Curate Classics</button>
                </div>
            </div>
        </div>
      </div>

      {/* Global Meta Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#0f0f0f] border border-red-500/20 p-8 rounded-[2.5rem] shadow-xl">
              <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                  <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Identity Module</h3>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Seasonal profile configuration</p>
                  </div>
                  <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-500">Live</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={holidaySettings.isHolidayModeActive} onChange={(e) => handleToggle('isHolidayModeActive', e.target.checked)} className="sr-only peer" />
                        <div className="w-14 h-7 bg-gray-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-1 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
              </div>

              <div className="space-y-4">
                  <input type="text" value={holidaySettings.holidayName} onChange={(e) => setHolidaySettings({...holidaySettings, holidayName: e.target.value})} placeholder="Session Title" className="form-input !bg-black/40" />
                  <textarea value={holidaySettings.holidayTagline} onChange={(e) => setHolidaySettings({...holidaySettings, holidayTagline: e.target.value})} placeholder="Session Narrative..." className="form-input !bg-black/40" rows={2} />
                  <select value={holidaySettings.holidayTheme} onChange={(e) => setHolidaySettings({...holidaySettings, holidayTheme: e.target.value as any})} className="form-input !bg-black/40">
                      <option value="christmas">Christmas</option>
                      <option value="valentines">Valentine's</option>
                      <option value="gold">Anniversary Gold</option>
                      <option value="generic">Neutral Dark</option>
                  </select>
                  <button onClick={saveIdentityDetails} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase text-[10px] tracking-widest">Commit Settings</button>
              </div>
          </div>

          <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] shadow-xl flex items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]"></div>
              <div className="space-y-4 relative z-10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                      <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <p className="text-gray-700 font-black uppercase text-[10px] tracking-[0.5em]">Global Control Axis</p>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto font-medium">Manifest synchronization propagates to all Roku and Web endpoints instantly.</p>
              </div>
          </div>
      </div>

      {/* Homepage Rows */}
      <div className="space-y-8">
        <div className="flex justify-between items-center border-b border-white/5 pb-6">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Homepage Clusters</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Public-facing row distribution</p>
            </div>
            <button onClick={() => setCategories({ [`row_${Date.now()}`]: { title: 'NEW_CLUSTER', movieKeys: [] }, ...categories })} className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">+ Add Cluster</button>
        </div>

        <div className="grid gap-4">
            {Object.entries(categories).map(([key, category]) => {
                const cat = category as Category;
                if (PROTECTED_KEYS.includes(key)) return null;
                return (
                    <div key={key} className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-white/10 transition-all shadow-xl">
                        <div className="flex-grow w-full">
                            <input type="text" value={cat.title} onChange={e => handleCategoryChange(key, 'title', e.target.value)} className="text-xl font-black uppercase tracking-tight bg-transparent text-white focus:outline-none w-full border-b border-transparent focus:border-white/10 italic" />
                            <div className="flex items-center gap-3 mt-2">
                                <p className="text-[10px] text-gray-600 uppercase font-black tracking-widest">{cat.movieKeys.length} Records Connected</p>
                                <div className="w-1 h-1 rounded-full bg-gray-800"></div>
                                <p className="text-[8px] text-gray-800 font-black uppercase tracking-widest">UID: {key}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                            <button onClick={() => setEditingCategoryKey(key)} className="bg-white/5 hover:bg-white text-gray-400 hover:text-black font-black py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all">Edit Content</button>
                            <button onClick={() => deleteCategory(key)} className="text-red-500 hover:text-red-400 font-black text-[9px] uppercase tracking-widest px-4 transition-colors">Purge</button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
      
      <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-6">
        <button onClick={() => onSave(categories)} disabled={isSaving} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-black py-6 px-24 rounded-[2rem] uppercase tracking-[0.3em] shadow-[0_30px_60px_rgba(239,68,68,0.3)] transition-all transform active:scale-95 text-sm">
            {isSaving ? 'Synchronizing Cluster...' : 'Commit Global Manifest'}
        </button>
      </div>

      {editingCategoryKey && (
        <MovieSelectorModal 
            allMovies={allMovies} 
            initialSelectedKeys={categories[editingCategoryKey].movieKeys || []} 
            title={`Curate: ${categories[editingCategoryKey].title}`}
            onSave={(newKeys) => handleMovieSelectionSave(editingCategoryKey, newKeys)} 
            onClose={() => setEditingCategoryKey(null)} 
        />
      )}
    </div>
  );
};

export default CategoryEditor;
