
import React, { useState, useEffect } from 'react';
import { moviesData as initialMoviesData, categoriesData as initialCategoriesData, festivalData as initialFestivalData, festivalConfigData as initialFestivalConfigData } from './constants.ts';
import { Movie, Category, FestivalDay, FestivalConfig, FilmBlock } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

// --- MovieSelectorModal Component ---
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
                <img src={movie.poster} alt="" className="w-10 h-10 object-cover rounded-md" />
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
// --- End MovieSelectorModal Component ---


const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>(initialFestivalConfigData);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  
  // Authentication State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  // UI State
  const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);

  const fetchAdminData = async () => {
    try {
        invalidateCache();
        const liveData = await fetchAndCacheLiveData();
        setMovies(liveData.movies);
        setCategories(liveData.categories);
        setFestivalData(liveData.festivalData);
        setFestivalConfig(liveData.festivalConfig);
    } catch (e) {
        console.error("Failed to fetch live data for admin, falling back to initial data.", e);
        setMovies(initialMoviesData);
        setCategories(initialCategoriesData);
        setFestivalData(initialFestivalData);
        setFestivalConfig(initialFestivalConfigData);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        setIsAuthenticated(true);
        fetchAdminData();
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginMessage('');
    setIsAuthenticating(true);

    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminPassword', password);
            setIsAuthenticated(true);
            if (data.firstLogin) {
                setLoginMessage("Setup complete! Secure your admin panel by adding this password as the ADMIN_PASSWORD environment variable.");
            }
            fetchAdminData();
        } else {
            setLoginError(data.error || 'Login failed.');
        }
    } catch (error) {
        setLoginError('An error occurred. Please try again.');
    } finally {
        setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setIsAuthenticated(false);
    setPassword('');
    setLoginError('');
  };
  
  const publishData = async () => {
    setPublishStatus('saving');
    setPublishError('');
    try {
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');
        
        const fullData = { movies, categories, festivalData, festivalConfig };

        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: fullData }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing failed.');
        }

        invalidateCache();
        setPublishStatus('success');
        
        // Notify other tabs to reload data
        const updateChannel = new BroadcastChannel('cratetv_data_update');
        updateChannel.postMessage({ type: 'update' });
        updateChannel.close();

        setTimeout(() => setPublishStatus('idle'), 2500);

    } catch (error) {
        setPublishStatus('error');
        setPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };
  
  const handleAddNewMovie = () => {
    setSelectedMovie({
      key: `newmovie${Date.now()}`,
      title: '', synopsis: '', cast: [], director: '',
      trailer: '', fullMovie: '', poster: '', tvPoster: '',
      likes: 0, releaseDateTime: getLocalDatetimeString(), mainPageExpiry: '',
    });
  };

  const handleMovieSave = (updatedMovie: Movie) => {
    const newMovies = { ...movies, [updatedMovie.key]: updatedMovie };
    setMovies(newMovies);
    // Add to 'newReleases' category automatically if not there already
    setCategories(prev => {
        const newCats = { ...prev };
        if (newCats.newReleases && !newCats.newReleases.movieKeys.includes(updatedMovie.key)) {
            newCats.newReleases.movieKeys.unshift(updatedMovie.key);
        }
        return newCats;
    });
    setSelectedMovie(null);
  };
  
  const handleMovieDelete = (movieKey: string) => {
     if (window.confirm('Are you sure you want to permanently delete this film from the library? This will also remove it from all categories and festival blocks.')) {
        const newMovies = { ...movies };
        delete newMovies[movieKey];
        
        const newCategories = JSON.parse(JSON.stringify(categories));
        Object.keys(newCategories).forEach(catKey => {
            newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
        });

        const newFestivalData = JSON.parse(JSON.stringify(festivalData));
        newFestivalData.forEach((day: FestivalDay) => {
            day.blocks.forEach((block: FilmBlock) => {
                block.movieKeys = block.movieKeys.filter((key: string) => key !== movieKey);
            });
        });
        
        setMovies(newMovies);
        setCategories(newCategories);
        setFestivalData(newFestivalData);
        setSelectedMovie(null);
    }
  }

  // Festival Data Handlers
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFestivalConfig(prev => ({ ...prev, [name]: value }));
  };
  const handleDayChange = (dayIndex: number, field: 'date', value: string) => {
    setFestivalData(currentData => currentData.map((day, i) => i === dayIndex ? { ...day, [field]: value } : day));
  };
  const handleBlockChange = (dayIndex: number, blockIndex: number, field: 'title', value: string) => {
    setFestivalData(currentData =>
      currentData.map((day, i) => i === dayIndex
        ? { ...day, blocks: day.blocks.map((block, j) => j === blockIndex ? { ...block, [field]: value } : block) }
        : day
      )
    );
  };
  const handleMovieSelectionSave = (dayIndex: number, blockIndex: number, newMovieKeys: string[]) => {
    setFestivalData(currentData =>
      currentData.map((day, i) => i === dayIndex
        ? { ...day, blocks: day.blocks.map((block, j) => j === blockIndex ? { ...block, movieKeys: newMovieKeys } : block) }
        : day
      )
    );
    setEditingBlock(null);
  };
  const addBlock = (dayIndex: number) => {
    const newBlock: FilmBlock = { id: `day${dayIndex + 1}-block${Date.now()}`, title: 'New Film Block', movieKeys: [] };
    setFestivalData(currentData => currentData.map((day, i) => i === dayIndex ? { ...day, blocks: [...day.blocks, newBlock] } : day));
  };
  const removeBlock = (dayIndex: number, blockIndex: number) => {
     setFestivalData(currentData => currentData.map((day, i) => i === dayIndex ? { ...day, blocks: day.blocks.filter((_, j) => j !== blockIndex) } : day));
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
          {loginMessage && <p className="text-green-400 text-sm mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">{loginMessage}</p>}
          <form onSubmit={handleAuth}>
            <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 pr-10" disabled={isAuthenticating}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s3.939 4 8 4 8-4 8-4-3.939-4-8-4-8 4-8 4zm13.707 1.293a1 1 0 01-1.414 1.414l-1.473-1.473A3.003 3.003 0 0110 12a3 3 0 01-3-3 2.999 2.999 0 01.176-1.041l-1.56-1.56a1 1 0 111.414-1.414l1.473 1.473A3.003 3.003 0 0110 8a3 3 0 013 3c0 .54-.14 1.04-.383 1.464z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}</button>
            </div>
            {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
            <button type="submit" className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-red-800 disabled:cursor-not-allowed" disabled={isAuthenticating}>{isAuthenticating ? 'Logging in...' : 'Login'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex justify-between items-center">
             <h1 className="text-2xl font-bold">Film Festival Editor</h1>
             <div className="flex items-center gap-4">
                 {publishError && <span className="text-red-400 text-sm">{publishError}</span>}
                 <button onClick={publishData} disabled={publishStatus === 'saving'} className={`font-bold py-2 px-5 rounded-md transition-colors w-48 text-center text-white ${publishStatus === 'saving' ? 'bg-blue-600' : publishStatus === 'success' ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'}`}>
                    {publishStatus === 'saving' ? 'Publishing...' : publishStatus === 'success' ? '✓ Published' : 'Save & Publish'}
                 </button>
                 <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Log Out</button>
             </div>
        </div>
      </header>
      
      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                 {/* Festival General Settings */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4 text-purple-400">Festival General Settings</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-300">Festival Title</label>
                            <input type="text" name="title" value={festivalConfig.title} onChange={handleConfigChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-purple-500" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300">Festival Description</label>
                            <textarea name="description" value={festivalConfig.description} onChange={handleConfigChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-purple-500"></textarea>
                        </div>
                    </div>
                </div>
                {/* Festival Schedule */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                     <h2 className="text-2xl font-bold mb-4 text-purple-400">Festival Schedule</h2>
                     <div className="space-y-6">
                        {festivalData.map((day, dayIndex) => (
                          <div key={day.day} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-bold text-white">Day {day.day}</h3>
                              <input type="text" value={day.date} onChange={e => handleDayChange(dayIndex, 'date', e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-white text-sm" />
                            </div>
                            <div className="space-y-4 pl-4 border-l-2 border-gray-600">
                              {day.blocks.map((block, blockIndex) => (
                                <div key={block.id} className="bg-gray-800 p-3 rounded-md">
                                   <div className="flex justify-between items-center mb-2">
                                        <input type="text" value={block.title} onChange={e => handleBlockChange(dayIndex, blockIndex, 'title', e.target.value)} className="w-full text-lg font-semibold bg-transparent text-white focus:outline-none focus:bg-gray-700 rounded-md px-2"/>
                                        <button onClick={() => removeBlock(dayIndex, blockIndex)} className="text-xs text-red-500 hover:text-red-400 ml-2 flex-shrink-0">Remove Block</button>
                                   </div>
                                   <p className="text-xs text-gray-400 mb-2">{block.movieKeys.length} film(s) selected.</p>
                                   <button onClick={() => setEditingBlock({ dayIndex, blockIndex })} className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md">Add/Remove Films</button>
                                </div>
                              ))}
                               <button onClick={() => addBlock(dayIndex)} className="text-sm bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md mt-4">+ Add Block</button>
                            </div>
                          </div>
                        ))}
                     </div>
                </div>
            </div>

            {/* Film Library */}
            <div className="lg:col-span-1">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 sticky top-24">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-purple-400">Film Library</h2>
                        <button onClick={handleAddNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md text-sm">+ Add Film</button>
                    </div>
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                        {Object.values(movies).sort((a,b) => a.title.localeCompare(b.title)).map(movie => (
                            <div key={movie.key} onClick={() => setSelectedMovie(movie)} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                <img src={movie.poster} alt={movie.title} className="w-12 h-16 object-cover rounded-md flex-shrink-0" />
                                <span className="text-white text-sm flex-grow">{movie.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </main>
      <Footer />

      {selectedMovie && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700 p-6">
                <MovieEditor 
                    movie={selectedMovie}
                    onSave={handleMovieSave}
                    onCancel={() => setSelectedMovie(null)}
                    onDelete={handleMovieDelete}
                />
            </div>
        </div>
      )}

       {editingBlock !== null && (
        <MovieSelectorModal
          allMovies={Object.values(movies)}
          initialSelectedKeys={festivalData[editingBlock.dayIndex].blocks[editingBlock.blockIndex].movieKeys}
          onSave={(newKeys) => handleMovieSelectionSave(editingBlock.dayIndex, editingBlock.blockIndex, newKeys)}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
};

export default AdminPage;
