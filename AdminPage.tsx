import React, { useState, useEffect } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import Footer from './components/Footer.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';
import { invalidateCache } from './services/dataService.ts';
import { listenToAllAdminData, saveMovie, deleteMovie, saveFestivalConfig, saveFestivalDays } from './services/firebaseService.ts';
import LoadingSpinner from './components/LoadingSpinner.tsx';

// Helper to format the current date/time for a datetime-local input
const getLocalDatetimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
};

const AdminPage: React.FC = () => {
  const [movies, setMovies] = useState<Record<string, Movie>>({});
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
  const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // Automatically grant access if running on localhost for easier development
    const isLocalDev = window.location.hostname === 'localhost';
    const isAdmin = sessionStorage.getItem('isAdminAuthenticated') === 'true';

    if (isAdmin || isLocalDev) {
        // If it's local dev, ensure session is set for other components
        if (isLocalDev && !sessionStorage.getItem('isAdminAuthenticated')) {
             sessionStorage.setItem('isAdminAuthenticated', 'true');
             // Set a dummy password in case other API calls need it (they will fail, but this prevents errors)
             sessionStorage.setItem('adminPassword', 'dev');
        }

        setIsAuthenticated(true);
        let unsubscribe: (() => void) | null = null;
        
        const loadAdminData = async () => {
            setIsLoading(true);
            unsubscribe = await listenToAllAdminData((data) => {
                setMovies(data.movies);
                setCategories(data.categories);
                setFestivalConfig(data.festivalConfig);
                setFestivalData(data.festivalData);
                setIsLoading(false);
            });
        };

        loadAdminData();
        
        return () => {
            if (unsubscribe) unsubscribe();
        };
    } else {
        setIsLoading(false);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const data = await response.json();
        if (response.ok) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            sessionStorage.setItem('adminPassword', password);
            window.location.reload();
        } else {
            setLoginError(data.error || 'Login failed.');
        }
    } catch (error) {
        setLoginError('An error occurred. Please try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.reload();
  };
  
  const showSaveStatus = (status: 'saving' | 'success' | 'error', errorMsg?: string) => {
    setSaveStatus(status);
    if (errorMsg) setSaveError(errorMsg);
    
    if (status === 'success' || status === 'error') {
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveError('');
      }, 3000);
    }
  };

  const handlePublish = async () => {
    if (!festivalConfig || !window.confirm('This will overwrite the live website with all current draft content. Are you sure you want to publish?')) {
        return;
    }
    
    setPublishStatus('publishing');
    setPublishError('');
    try {
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');

        const dataToPublish = { movies, categories, festivalData, festivalConfig };

        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: dataToPublish }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing failed.');
        }

        invalidateCache();
        setPublishStatus('success');
        setTimeout(() => setPublishStatus('idle'), 3000);

    } catch (error) {
        setPublishStatus('error');
        setPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };
  
  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsAddingNew(false);
  };
  
  const handleAddNewMovie = () => {
    const newMovie: Movie = {
      key: `newmovie${Date.now()}`,
      title: 'New Movie Title',
      synopsis: '',
      cast: [],
      director: '',
      trailer: '',
      fullMovie: '',
      poster: '',
      tvPoster: '',
      likes: 0,
      releaseDateTime: getLocalDatetimeString(),
      mainPageExpiry: '',
    };
    setSelectedMovie(newMovie);
    setIsAddingNew(true);
  };
  
  const handleCancel = () => {
    setSelectedMovie(null);
    setIsAddingNew(false);
  };

  const handleSaveMovie = async (updatedMovie: Movie) => {
    showSaveStatus('saving');
    try {
        await saveMovie(updatedMovie);
        showSaveStatus('success');
        setSelectedMovie(null);
        setIsAddingNew(false);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to save movie.';
        showSaveStatus('error', msg);
    }
  };

  const handleDeleteMovie = async (movieKey: string) => {
    if (window.confirm('This will delete the movie from your drafts. It will NOT be removed from the live site until you publish. Are you sure?')) {
        showSaveStatus('saving');
        try {
            await deleteMovie(movieKey);
            showSaveStatus('success');
            setSelectedMovie(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to delete movie.';
            showSaveStatus('error', msg);
        }
    }
  };
  
  const handleSaveFestival = async (updatedFestivalData: FestivalDay[], updatedFestivalConfig: FestivalConfig) => {
    showSaveStatus('saving');
    try {
        await saveFestivalConfig(updatedFestivalConfig);
        await saveFestivalDays(updatedFestivalData);
        showSaveStatus('success');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to save festival data.';
        showSaveStatus('error', msg);
    }
  };

  const handleSetLiveStatus = async (isLive: boolean) => {
    if (!festivalConfig) return;
    showSaveStatus('saving');
    const updatedConfig = { ...festivalConfig, isFestivalLive: isLive };
    try {
        await saveFestivalConfig(updatedConfig);
        showSaveStatus('success');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to update live status.';
        showSaveStatus('error', msg);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
          <h1 className="text-2xl font-bold mb-6 text-center text-white">Admin Login</h1>
          <form onSubmit={handleAuth}>
            <div className="relative">
              <input
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pr-10 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              >
                {isPasswordVisible ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM9 4.803A7.968 7.968 0 0110 5c3.479 0 6.527 2.162 7.944 5.234a.5.5 0 01-.44 0C16.527 12.838 13.479 15 10 15a7.969 7.969 0 01-1.04-.085l-1.732 1.732a10.003 10.003 0 0012.732-12.732L9 4.803zM4.536 7.944A9.975 9.975 0 012.056 10a.5.5 0 00.44 0C3.473 12.838 6.521 15 10 15c.39 0 .774-.04 1.148-.114l-1.428-1.428a4 4 0 01-5.18-5.18L4.536 7.944zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            {loginError && <p className="text-red-500 text-sm mt-2 text-center">{loginError}</p>}
            <button type="submit" className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-gray-800 shadow-md p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">Admin Panel (Draft Mode)</h1>
              <div className="flex items-center gap-4">
                  {saveStatus === 'saving' && <span className="text-sm text-blue-300">Saving draft...</span>}
                  {saveStatus === 'success' && <span className="text-sm text-green-400">✓ Draft Saved</span>}
                  {saveStatus === 'error' && <span className="text-sm text-red-400">Error: {saveError}</span>}

                  <button 
                      onClick={handlePublish}
                      disabled={publishStatus === 'publishing'}
                      className={`font-bold py-2 px-5 rounded-md text-sm transition-colors ${
                        publishStatus === 'publishing' ? 'bg-yellow-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                  >
                      {publishStatus === 'publishing' ? 'Publishing...' : 'Publish Changes to Live Site'}
                  </button>
                  <button onClick={handleLogout} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md text-sm">
                      Log Out
                  </button>
              </div>
          </div>
          {publishStatus === 'success' && <p className="text-center text-sm text-green-400 mt-2">✓ Successfully published changes to the live site!</p>}
          {publishStatus === 'error' && <p className="text-center text-sm text-red-400 mt-2">Publish failed: {publishError}</p>}
      </header>

      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {festivalConfig && (
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                <FestivalEditor
                    initialData={festivalData}
                    initialConfig={festivalConfig}
                    allMovies={movies}
                    onSave={handleSaveFestival}
                    onPublishLiveStatus={handleSetLiveStatus}
                />
            </div>
          )}
          
          <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold">Content Management</h2>
              <button
                  onClick={handleAddNewMovie}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
              >
                  Add New Movie
              </button>
          </div>

          {selectedMovie ? (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-700">
              <MovieEditor 
                movie={selectedMovie}
                onSave={handleSaveMovie}
                onCancel={handleCancel}
                onDelete={handleDeleteMovie}
              />
            </div>
          ) : (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Select a Movie to Edit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* FIX: Add explicit 'Movie' type to sort and map callbacks to resolve TypeScript errors. */}
                {Object.values(movies).sort((a: Movie, b: Movie) => a.title.localeCompare(b.title)).map((movie: Movie) => (
                  <div key={movie.key} className="group" onClick={() => handleSelectMovie(movie)}>
                    <div className="relative w-full aspect-[3/4] rounded-md overflow-hidden cursor-pointer bg-gray-900 transition-transform duration-300 ease-in-out hover:scale-105">
                        <img src={movie.poster} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <p className="text-sm mt-2 text-center truncate group-hover:text-red-400 cursor-pointer">{movie.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPage;