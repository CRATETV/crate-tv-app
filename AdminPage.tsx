import React, { useState, useEffect } from 'react';
// FIX: Imported the 'LiveData' type to resolve 'Cannot find name' errors.
import { fetchAndCacheLiveData, invalidateCache, LiveData } from './services/dataService.ts';
import { Movie, Category, FestivalDay, FestivalConfig, FilmBlock } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
import ConstantsUploader from './components/ConstantsUploader.tsx';
import FestivalEditor from './components/FestivalEditor.tsx'; // Import the dedicated editor

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
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
     if (window.confirm('Are you sure you want to permanently delete this film? This will remove it from all categories and festival blocks.')) {
        setData((prev: LiveData | null) => {
            if (!prev) return null;
            // Delete from movies object
            const newMovies = { ...prev.movies };
            delete newMovies[movieKey];
            
            // Delete from categories
            const newCategories = JSON.parse(JSON.stringify(prev.categories));
            Object.keys(newCategories).forEach(catKey => {
                newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
            });
            
            // Delete from festival data
            const newFestivalData = JSON.parse(JSON.stringify(prev.festivalData));
            newFestivalData.forEach((day: FestivalDay) => {
                day.blocks.forEach((block: FilmBlock) => {
                    block.movieKeys = block.movieKeys.filter((key: string) => key !== movieKey);
                });
            });
            return { ...prev, movies: newMovies, categories: newCategories, festivalData: newFestivalData };
        });
        setSelectedMovie(null); // Close editor if the movie was deleted
     }
    };
    
    const handleFestivalSave = (newFestivalData: FestivalDay[], newFestivalConfig: FestivalConfig) => {
        setData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                festivalData: newFestivalData,
                festivalConfig: newFestivalConfig
            }
        });
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-900 text-white p-4">
                <div className="m-auto w-full max-w-md">
                    <h1 className="text-3xl font-bold text-center mb-6">Admin Panel</h1>
                    <form onSubmit={handleAuth} className="bg-gray-800 p-8 rounded-lg shadow-lg">
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                                required
                            />
                        </div>
                        {loginError && <p className="text-red-500 text-sm mb-4">{loginError}</p>}
                        {loginMessage && <p className="text-green-400 text-sm mb-4">{loginMessage}</p>}
                        <button type="submit" disabled={isAuthenticating} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-red-800">
                            {isAuthenticating ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <p>Loading admin data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <div>
                    <button onClick={publishData} disabled={publishStatus === 'saving'} className={`mr-4 font-bold py-2 px-4 rounded-md transition-colors ${
                        publishStatus === 'saving' ? 'bg-yellow-700 cursor-not-allowed' : 
                        publishStatus === 'success' ? 'bg-green-600' : 
                        publishStatus === 'error' ? 'bg-red-700' : 'bg-green-600 hover:bg-green-700'
                    }`}>
                        {publishStatus === 'saving' ? 'Publishing...' : (publishStatus === 'success' ? 'Published!' : 'Publish Live Data')}
                    </button>
                    <button onClick={handleLogout} className="text-gray-300 hover:text-white">Logout</button>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-8">
                {publishStatus === 'error' && <div className="max-w-7xl mx-auto mb-4 text-red-400 bg-red-900/50 p-3 rounded-md border border-red-800">Error publishing: {publishError}</div>}

                {selectedMovie ? (
                    <div className="max-w-4xl mx-auto bg-gray-800 p-6 rounded-lg">
                        <MovieEditor
                            movie={selectedMovie}
                            onSave={handleMovieSave}
                            onCancel={() => setSelectedMovie(null)}
                            onDelete={handleMovieDelete}
                        />
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-6 flex border-b border-gray-700">
                            <button onClick={() => setActiveTab('festival')} className={`py-2 px-4 ${activeTab === 'festival' ? 'border-b-2 border-purple-500 text-white' : 'text-gray-400'}`}>Festival Editor</button>
                            <button onClick={() => setActiveTab('movies')} className={`py-2 px-4 ${activeTab === 'movies' ? 'border-b-2 border-red-500 text-white' : 'text-gray-400'}`}>Movie Management</button>
                            <button onClick={() => setActiveTab('upload')} className={`py-2 px-4 ${activeTab === 'upload' ? 'border-b-2 border-yellow-500 text-white' : 'text-gray-400'}`}>Constants Uploader</button>
                        </div>

                        {activeTab === 'festival' && (
                            <FestivalEditor 
                                initialData={data.festivalData}
                                initialConfig={data.festivalConfig}
                                allMovies={data.movies}
                                onSave={handleFestivalSave}
                            />
                        )}
                        {activeTab === 'movies' && (
                            <div>
                                <button onClick={handleAddNewMovie} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mb-4">
                                + Add New Movie
                                </button>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {Object.values(data.movies).sort((a,b) => a.title.localeCompare(b.title)).map(movie => (
                                        <div key={movie.key} onClick={() => setSelectedMovie(movie)} className="cursor-pointer group">
                                            <img src={movie.poster} alt={movie.title} className="w-full rounded-md aspect-[3/4] object-cover border-2 border-transparent group-hover:border-red-500"/>
                                            <p className="text-sm mt-1 text-gray-300 group-hover:text-white truncate">{movie.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'upload' && (
                            <div>
                                <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700">
                                    <h2 className="text-xl font-bold mb-4 text-red-400">Upload `constants.ts` (Dev Tool)</h2>
                                    <p className="text-gray-400 mb-4 text-sm">
                                        This tool overwrites all live data with the contents of a local `constants.ts` file. 
                                        This is a destructive action for rapid development and should be used with extreme caution.
                                    </p>
                                    <ConstantsUploader />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};
export default AdminPage;
