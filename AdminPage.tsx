import React, { useState, useEffect } from 'react';
// FIX: Imported the 'LiveData' type to resolve 'Cannot find name' errors.
import { fetchAndCacheLiveData, invalidateCache, LiveData } from './services/dataService.ts';
import { Movie, Category, FestivalDay, FestivalConfig, FilmBlock } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
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
  const [activeView, setActiveView] = useState<'dashboard' | 'festival' | 'movies'>('dashboard');
  const [showPassword, setShowPassword] = useState(false);

  const fetchAdminData = async () => {
    try {
        invalidateCache();
        const { data: liveData } = await fetchAndCacheLiveData();
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

  const publishData = async (dataToPublish?: LiveData) => {
    const payload = dataToPublish || data;
    if (!payload) {
        setPublishError("No data available to publish.");
        setPublishStatus('error');
        throw new Error("No data available to publish.");
    }

    setPublishStatus('saving');
    setPublishError('');
    try {
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');
        
        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: payload }),
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
    } catch (error) {
        setPublishStatus('error');
        setPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
        throw error; // Re-throw to allow callers to handle their own UI state
    }
  };

  const handleMainPublishClick = async () => {
    await publishData().catch(() => {}); // Catch error to prevent unhandled rejection
    if (publishStatus !== 'error') {
        setTimeout(() => setPublishStatus('idle'), 3500);
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

    const handlePublishFestivalStatus = async (newStatus: boolean) => {
      if (!data) throw new Error("Data not loaded");
      
      const updatedData = JSON.parse(JSON.stringify(data));
      updatedData.festivalConfig.isFestivalLive = newStatus;
      
      // Update local state immediately for a responsive UI
      setData(updatedData);

      // Publish this specific state immediately
      await publishData(updatedData);
    };

    const handleDownloadConstants = () => {
        if (!data) {
            alert("Data not loaded yet.");
            return;
        }

        const fileContent = `
import { Category, Movie, FestivalDay, FestivalConfig } from './types.ts';

export const festivalConfigData: FestivalConfig = ${JSON.stringify(data.festivalConfig, null, 2)};

export const categoriesData: Record<string, Category> = ${JSON.stringify(data.categories, null, 2)};

export const moviesData: Record<string, Movie> = ${JSON.stringify(data.movies, null, 2)};

export const festivalData: FestivalDay[] = ${JSON.stringify(data.festivalData, null, 2)};
`.trim();

        const blob = new Blob([fileContent], { type: 'text/typescript;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "constants.ts");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-900 text-white p-4">
                <div className="m-auto w-full max-w-md">
                    <h1 className="text-3xl font-bold text-center mb-6">Admin Panel</h1>
                    <form onSubmit={handleAuth} className="bg-gray-800 p-8 rounded-lg shadow-lg">
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                            <div className="relative mt-1">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500 pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                          <path d="M2 10s3.939-7 8-7 8 7 8 7-3.939 7-8 7-8-7-8-7zm7.939 1.253a1.25 1.25 0 011.768-1.768l-1.768 1.768z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
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

    const renderDashboard = () => (
        <div className="max-w-4xl mx-auto text-center">
             <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-white">Admin Dashboard</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Manage Festival Card */}
                <div onClick={() => setActiveView('festival')} className="bg-gradient-to-br from-purple-800 to-indigo-800 p-8 rounded-xl shadow-lg border border-purple-600 cursor-pointer transform hover:scale-105 transition-transform duration-300">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2H5z" /></svg>
                     <h3 className="text-2xl font-bold text-white">Manage Festival</h3>
                     <p className="text-purple-200 mt-2">Edit festival schedule, film blocks, and set live status.</p>
                </div>
                {/* Manage Films Card */}
                <div onClick={() => setActiveView('movies')} className="bg-gradient-to-br from-red-800 to-pink-800 p-8 rounded-xl shadow-lg border border-red-600 cursor-pointer transform hover:scale-105 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                     <h3 className="text-2xl font-bold text-white">Manage Films</h3>
                     <p className="text-red-200 mt-2">Add, edit, or delete individual films from the library.</p>
                </div>
             </div>

             {/* Developer Tools Section */}
             <div className="mt-12 pt-8 border-t border-gray-700">
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">Developer Tools</h3>
                <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg border border-gray-600 text-left">
                    <h4 className="font-semibold text-lg text-white">Download Live Data</h4>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Download the current live data as a `constants.ts` file. This is useful for backups or syncing with your local development environment.</p>
                    <button onClick={handleDownloadConstants} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md w-full">
                        Download constants.ts
                    </button>
                </div>
             </div>
        </div>
    );

    const renderEditorView = (title: string, children: React.ReactNode) => (
         <div className="max-w-7xl mx-auto">
            <button onClick={() => setActiveView('dashboard')} className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md text-sm inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                Back to Dashboard
            </button>
            {children}
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <div>
                    <button onClick={handleMainPublishClick} disabled={publishStatus === 'saving'} className={`mr-4 font-bold py-2 px-4 rounded-md transition-colors ${
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
                {publishStatus === 'success' && (
                  <div className="max-w-7xl mx-auto mb-4 text-green-300 bg-green-900/50 p-3 rounded-md border border-green-800">
                    <strong>Published Successfully!</strong> It may take up to a minute for your changes to appear on the live site due to caching.
                  </div>
                )}


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
                    <>
                        {activeView === 'dashboard' && renderDashboard()}
                        {activeView === 'festival' && renderEditorView('Festival Editor', 
                            <FestivalEditor 
                                initialData={data.festivalData}
                                initialConfig={data.festivalConfig}
                                allMovies={data.movies}
                                onSave={handleFestivalSave}
                                onPublishLiveStatus={handlePublishFestivalStatus}
                            />
                        )}
                        {activeView === 'movies' && renderEditorView('Movie Management',
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
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};
export default AdminPage;