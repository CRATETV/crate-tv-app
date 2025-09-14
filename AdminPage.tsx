import React, { useState, useEffect } from 'react';
// FIX: Imported the 'LiveData' type to resolve 'Cannot find name' errors.
import { fetchAndCacheLiveData, invalidateCache, LiveData } from './services/dataService.ts';
import { Movie, Category, FestivalDay, FestivalConfig, FilmBlock } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
import ConstantsUploader from './components/ConstantsUploader.tsx';

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

// --- MovieSelectorModal Component (Used by Festival Editor) ---
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
          <input type="text" placeholder="Search films..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mt-2 form-input" />
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="space-y-2">
            {filteredMovies.map(movie => (
              <label key={movie.key} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                <input type="checkbox" checked={selectedKeys.has(movie.key)} onChange={() => toggleSelection(movie.key)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-red-500 focus:ring-red-500" />
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

// Main Admin Page
const AdminPage: React.FC = () => {
  const [data, setData] = useState<LiveData | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [activeTab, setActiveTab] = useState('festival');
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);

  const fetchAdminData = async () => {
    try {
        invalidateCache();
        const liveData = await fetchAndCacheLiveData();
        setData(liveData);
    } catch (e) {
        console.error("Failed to fetch live data for admin.", e);
        setPublishError("Could not load live data.");
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
        const resData = await response.json();
        if (response.ok && resData.success) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminPassword', password);
            setIsAuthenticated(true);
            if (resData.firstLogin) {
                setLoginMessage("Setup complete! Secure your admin panel by adding this password as the ADMIN_PASSWORD environment variable.");
            }
            fetchAdminData();
        } else {
            setLoginError(resData.error || 'Login failed.');
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
        
        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: data }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing failed.');
        }

        invalidateCache();
        setPublishStatus('success');
        const updateChannel = new BroadcastChannel('cratetv_data_update');
        updateChannel.postMessage({ type: 'update' });
        updateChannel.close();
        setTimeout(() => setPublishStatus('idle'), 2500);
    } catch (error) {
        setPublishStatus('error');
        setPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };

  const handleAddNewMovie = () => setSelectedMovie({
    key: `newmovie${Date.now()}`, title: '', synopsis: '', cast: [], director: '',
    trailer: '', fullMovie: '', poster: '', tvPoster: '',
    likes: 0, releaseDateTime: getLocalDatetimeString(), mainPageExpiry: '',
  });

  const handleMovieSave = (updatedMovie: Movie) => {
    setData((prev: LiveData | null) => {
        if (!prev) return null;
        const newMovies = { ...prev.movies, [updatedMovie.key]: updatedMovie };
        const newCats = { ...prev.categories };
        if (newCats.newReleases && !newCats.newReleases.movieKeys.includes(updatedMovie.key)) {
            newCats.newReleases.movieKeys.unshift(updatedMovie.key);
        }
        return { ...prev, movies: newMovies, categories: newCats };
    });
    setSelectedMovie(null);
  };

  const handleMovieDelete = (movieKey: string) => {
     if (window.confirm('Are you sure you want to permanently delete this film?')) {
        setData((prev: LiveData | null) => {
            if (!prev) return null;
            const newMovies = { ...prev.movies };
            delete newMovies[movieKey];
            const newCategories = JSON.parse(JSON.stringify(prev.categories));
            Object.keys(newCategories).forEach(catKey => {
                newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
            });
            const newFestivalData = JSON.parse(JSON.stringify(prev.festivalData));
            newFestivalData.forEach((day: FestivalDay) => {
                day.blocks.forEach((block: FilmBlock) => {
                    block.movieKeys = block.movieKeys.filter((key: string) => key !== movieKey);
                });
            });
            return { ...prev, movies: newMovies, categories: newCategories, festivalData: newFestivalData };
        });
        setSelectedMovie(null);
    }
  };

  // Festival Data Handlers
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData((prev: LiveData | null) => {
        if (!prev) return null;
        const currentConfig = prev.festivalConfig || { title: '', description: '' };
        return { ...prev, festivalConfig: { ...currentConfig, [name]: value } };
    });
  };
  const handleFestivalLiveToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setData((prev: LiveData | null) => {
        if (!prev) return null;
        const currentConfig = prev.festivalConfig || { title: '', description: '' };
        return { ...prev, festivalConfig: { ...currentConfig, isFestivalLive: checked }};
    });
  };
  const handleDayChange = (dayIndex: number, field: 'date', value: string) => {
    setData((prev: LiveData | null) => (prev ? {...prev, festivalData: prev.festivalData.map((day, i) => i === dayIndex ? { ...day, [field]: value } : day)} : null));
  };
  const handleBlockChange = (dayIndex: number, blockIndex: number, field: 'title', value: string) => {
    setData((prev: LiveData | null) => (prev ? {...prev, festivalData: prev.festivalData.map((day, i) => i === dayIndex
        ? { ...day, blocks: day.blocks.map((block, j) => j === blockIndex ? { ...block, [field]: value } : block) }
        : day)}: null));
  };
  const handleMovieSelectionSave = (dayIndex: number, blockIndex: number, newMovieKeys: string[]) => {
    setData((prev: LiveData | null) => (prev ? {...prev, festivalData: prev.festivalData.map((day, i) => i === dayIndex
        ? { ...day, blocks: day.blocks.map((block, j) => j === blockIndex ? { ...block, movieKeys: newMovieKeys } : block) }
        : day)} : null));
    setEditingBlock(null);
  };
  const addBlock = (dayIndex: number) => {
    const newBlock: FilmBlock = { id: `day${dayIndex + 1}-block${Date.now()}`, title: 'New Film Block', movieKeys: [] };
    setData((prev: LiveData | null) => (prev ? {...prev, festivalData: prev.festivalData.map((day, i) => i === dayIndex ? { ...day, blocks: [...day.blocks, newBlock] } : day)} : null));
  };
  const removeBlock = (dayIndex: number, blockIndex: number) => {
     setData((prev: LiveData | null) => (prev ? {...prev, festivalData: prev.festivalData.map((day, i) => i === dayIndex ? { ...day, blocks: day.blocks.filter((_, j) => j !== blockIndex) } : day)} : null));
  };

  const TabButton: React.FC<{ tabName: string, children: React.ReactNode }> = ({ tabName, children }) => (
    <button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tabName ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800/50'}`}>
        {children}
    </button>
  );

  const [isPackaging, setIsPackaging] = useState(false);
  const [packageError, setPackageError] = useState('');

  const generateRokuZip = async () => {
    setIsPackaging(true);
    setPackageError('');
    try {
        const response = await fetch('/api/generate-roku-zip');
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to generate package');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cratv.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        setPackageError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsPackaging(false);
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
          {loginMessage && <p className="text-green-400 text-sm mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md">{loginMessage}</p>}
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full form-input" disabled={isAuthenticating}/>
            {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
            <button type="submit" className="w-full submit-btn" disabled={isAuthenticating}>{isAuthenticating ? 'Logging in...' : 'Login'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex justify-between items-center">
             <h1 className="text-2xl font-bold">Admin Panel</h1>
             <div className="flex items-center gap-4">
                 {publishError && <span className="text-red-400 text-sm">{publishError}</span>}
                 <button onClick={publishData} disabled={publishStatus === 'saving'} className={`font-bold py-2 px-5 rounded-md transition-colors w-48 text-center text-white ${publishStatus === 'saving' ? 'bg-blue-600' : publishStatus === 'success' ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'}`}>
                    {publishStatus === 'saving' ? 'Publishing...' : publishStatus === 'success' ? '✓ Published' : 'Save & Publish All'}
                 </button>
                 <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Log Out</button>
             </div>
        </div>
      </header>
      
      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex border-b border-gray-700">
                <TabButton tabName="festival">Film Festival</TabButton>
                <TabButton tabName="sales">Sales Data</TabButton>
                <TabButton tabName="roku">Roku Packager</TabButton>
                <TabButton tabName="dev">Developer Tools</TabButton>
            </div>
            <div className="bg-gray-800 p-6 rounded-b-lg">
                {!data ? (
                    <p>Loading data...</p>
                ) : (
                    <>
                        {activeTab === 'festival' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="title" className="block text-sm font-medium text-gray-300">Festival Title</label>
                                            <input type="text" name="title" value={data.festivalConfig?.title || ''} onChange={handleConfigChange} className="mt-1 block w-full form-input" />
                                        </div>
                                        <div>
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-300">Festival Description</label>
                                            <textarea name="description" value={data.festivalConfig?.description || ''} onChange={handleConfigChange} rows={3} className="mt-1 block w-full form-input"></textarea>
                                        </div>
                                        <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-md">
                                            <label htmlFor="isFestivalLive" className="font-medium text-gray-200">Make Festival Publicly Visible</label>
                                            <div className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="isFestivalLive"
                                                    checked={data.festivalConfig?.isFestivalLive ?? false}
                                                    onChange={handleFestivalLiveToggle}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        {data.festivalData.map((day: FestivalDay, dayIndex: number) => (
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
                                <div className="lg:col-span-1">
                                    <div className="sticky top-24">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold">Film Library</h2>
                                            <button onClick={handleAddNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md text-sm">+ Add Film</button>
                                        </div>
                                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                            {Object.values(data.movies).sort((a: any, b: any) => a.title.localeCompare(b.title)).map((movie: any) => (
                                                <div key={movie.key} onClick={() => setSelectedMovie(movie)} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                                    <img src={movie.poster} alt={movie.title} className="w-12 h-16 object-cover rounded-md flex-shrink-0" />
                                                    <span className="text-white text-sm flex-grow">{movie.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'sales' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4">Sales Data</h2>
                                <div className="bg-gray-700/50 p-6 rounded-lg text-center">
                                    <p className="text-gray-400">Payment processing and sales data are temporarily unavailable.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'roku' && (
                             <div>
                                <h2 className="text-2xl font-bold mb-4">Automated Roku Channel Packager</h2>
                                <div className="bg-gray-700/50 p-6 rounded-lg">
                                    <p className="text-gray-300 mb-4">Click the button below to generate a ready-to-upload ZIP file for the Crate TV Roku channel. The channel will automatically pull its content from the live website data.</p>
                                    <button onClick={generateRokuZip} disabled={isPackaging} className="submit-btn">
                                        {isPackaging ? 'Packaging...' : 'Generate & Download Roku ZIP'}
                                    </button>
                                    {packageError && <p className="text-red-400 mt-4 text-sm">{packageError}</p>}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'dev' && (
                             <div>
                                <h2 className="text-2xl font-bold mb-4">Developer Tools</h2>
                                <div className="bg-gray-700/50 p-6 rounded-lg space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-red-400 mb-2">Overwrite Live Data from File</h3>
                                        <p className="text-sm text-gray-400 mb-4">This is a dangerous operation. Upload a `constants.ts` file to completely replace all movies, categories, and festival data on the live site. Use with extreme caution.</p>
                                        <ConstantsUploader />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </main>
      <Footer />

      {selectedMovie && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700 p-6">
                <MovieEditor movie={selectedMovie} onSave={handleMovieSave} onCancel={() => setSelectedMovie(null)} onDelete={handleMovieDelete} />
            </div>
        </div>
      )}

       {editingBlock !== null && data && (
        <MovieSelectorModal allMovies={Object.values(data.movies)} initialSelectedKeys={data.festivalData[editingBlock.dayIndex].blocks[editingBlock.blockIndex].movieKeys} onSave={(newKeys) => handleMovieSelectionSave(editingBlock.dayIndex, editingBlock.blockIndex, newKeys)} onClose={() => setEditingBlock(null)} />
      )}
    </div>
  );
};

export default AdminPage;