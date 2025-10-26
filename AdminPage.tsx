import React, { useState, useEffect } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig, AboutData } from './types';
import MovieEditor from './components/MovieEditor';
import Footer from './components/Footer';
import FestivalEditor from './components/FestivalEditor';
import { invalidateCache } from './services/dataService';
import { listenToAllAdminData, saveMovie, deleteMovie, saveFestivalConfig, saveFestivalDays, saveCategories, saveAboutData } from './services/firebaseService';
import LoadingSpinner from './components/LoadingSpinner';
import CategoryEditor from './components/CategoryEditor';
import AboutEditor from './components/AboutEditor';
import FallbackGenerator from './components/FallbackGenerator';

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
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('movies');
  
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  
  const [dataSource, setDataSource] = useState<'firebase' | 'fallback' | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // State for Tools tab
  const [isGeneratingRoku, setIsGeneratingRoku] = useState(false);
  const [rokuGenerationError, setRokuGenerationError] = useState('');

  useEffect(() => {
    const isLocalDev = window.location.hostname === 'localhost';
    const isAdmin = sessionStorage.getItem('isAdminAuthenticated') === 'true';

    if (isAdmin || isLocalDev) {
        if (isLocalDev && !sessionStorage.getItem('isAdminAuthenticated')) {
             sessionStorage.setItem('isAdminAuthenticated', 'true');
             sessionStorage.setItem('adminPassword', 'dev');
        }

        setIsAuthenticated(true);
        setIsLoading(true);
        
        const unsubscribePromise = listenToAllAdminData((result) => {
            setMovies(result.data.movies);
            setCategories(result.data.categories);
            setFestivalConfig(result.data.festivalConfig);
            setFestivalData(result.data.festivalData);
            setAboutData(result.data.aboutData);
            setDataSource(result.source);
            if (result.error) {
                setConnectionError(result.error);
            }
            setIsLoading(false);
        });
        
        return () => {
            unsubscribePromise.then(unsub => unsub());
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
    if (!festivalConfig || !aboutData || !window.confirm('This will overwrite the live website with all current draft content. Are you sure you want to publish?')) {
        return;
    }
    
    setPublishStatus('publishing');
    setPublishError('');
    try {
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');

        const dataToPublish = { movies, categories, festivalData, festivalConfig, aboutData };

        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: dataToPublish }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing failed.');
        }

        const timestamp = Date.now();
        localStorage.setItem('cratetv-last-publish-timestamp', timestamp.toString());
        console.log(`[Admin] Set last publish timestamp in localStorage: ${new Date(timestamp).toLocaleString()}`);
        
        const channel = new BroadcastChannel('cratetv-data-channel');
        channel.postMessage({ type: 'DATA_PUBLISHED', payload: dataToPublish });
        channel.close();
        console.log('[Admin] Sent DATA_PUBLISHED broadcast to other tabs.');

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
      durationInMinutes: 0,
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
        // FIX: Update local state immediately to prevent race conditions on publish.
        setMovies(prev => ({ ...prev, [updatedMovie.key]: updatedMovie }));
        showSaveStatus('success');
        setSelectedMovie(null);
        setIsAddingNew(false);
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to save movie.';
        showSaveStatus('error', msg);
    }
  };
  
  const handleSaveCategories = async (updatedCategories: Record<string, Category>) => {
    showSaveStatus('saving');
    try {
      await saveCategories(updatedCategories);
      // FIX: Update local state immediately to prevent race conditions on publish.
      setCategories(updatedCategories);
      showSaveStatus('success');
    } catch (error) {
       const msg = error instanceof Error ? error.message : 'Failed to save categories.';
       showSaveStatus('error', msg);
    }
  };

  const handleSaveAboutData = async (updatedAboutData: AboutData) => {
    showSaveStatus('saving');
    try {
        await saveAboutData(updatedAboutData);
        setAboutData(updatedAboutData); // FIX: Update local state to ensure it's included in the next publish action.
        showSaveStatus('success');
    } catch (error) {
       const msg = error instanceof Error ? error.message : 'Failed to save site content.';
       showSaveStatus('error', msg);
    }
  };

  const handleDeleteMovie = async (movieKey: string) => {
    if (window.confirm('This will delete the movie from your drafts. It will NOT be removed from the live site until you publish. Are you sure?')) {
        showSaveStatus('saving');
        try {
            await deleteMovie(movieKey);
            // FIX: Update local state immediately to prevent race conditions on publish.
            // This replicates the backend logic of removing the movie and its references in categories.
            setMovies(prev => {
                const newState = { ...prev };
                delete newState[movieKey];
                return newState;
            });
            setCategories(prev => {
                const newState = { ...prev };
                Object.keys(newState).forEach(catKey => {
                    newState[catKey] = {
                        ...newState[catKey],
                        movieKeys: newState[catKey].movieKeys.filter(key => key !== movieKey),
                    };
                });
                return newState;
            });
            showSaveStatus('success');
            setSelectedMovie(null);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to delete movie.';
            showSaveStatus('error', msg);
        }
    }
  };
  
  const handleSaveFestival = async () => {
    if (!festivalConfig) return;
    showSaveStatus('saving');
    try {
        await saveFestivalConfig(festivalConfig);
        await saveFestivalDays(festivalData);
        showSaveStatus('success');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to save festival data.';
        showSaveStatus('error', msg);
    }
  };
  
  const handleSetLiveStatus = async (isLive: boolean, currentConfig: FestivalConfig, currentData: FestivalDay[]) => {
    // The config and data are passed directly from the editor, ensuring we use the latest state.
    if (!currentConfig || !aboutData) return;
    
    setPublishStatus('publishing');
    setPublishError('');

    const updatedConfig = { ...currentConfig, isFestivalLive: isLive };
    
    try {
        // Save the latest data to Firebase
        await saveFestivalConfig(updatedConfig);
        await saveFestivalDays(currentData);
        
        // Update the state locally for immediate UI responsiveness.
        setFestivalConfig(updatedConfig);
        setFestivalData(currentData);
        
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) throw new Error('Authentication error. Please log in again.');
        
        // Prepare the payload for S3 and broadcast with the latest data.
        const dataToPublish = { 
            movies, 
            categories, 
            festivalData: currentData, // Use the latest data from the editor
            festivalConfig: updatedConfig, // Use the new updated config
            aboutData
        };

        const response = await fetch('/api/publish-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword, data: dataToPublish }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Publishing live status failed.');
        }

        const timestamp = Date.now();
        localStorage.setItem('cratetv-last-publish-timestamp', timestamp.toString());
        
        const channel = new BroadcastChannel('cratetv-data-channel');
        channel.postMessage({ type: 'DATA_PUBLISHED', payload: dataToPublish });
        channel.close();
        console.log(`[Admin] Sent DATA_PUBLISHED broadcast. Festival live status: ${isLive}`);

        setPublishStatus('success');
        setTimeout(() => setPublishStatus('idle'), 3000);

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to update and publish live status.';
        setPublishStatus('error');
        setPublishError(msg);
    }
  };
  
  const handleGenerateRokuPackage = async () => {
        setIsGeneratingRoku(true);
        setRokuGenerationError('');
        try {
            const response = await fetch('/api/generate-roku-zip');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate Roku package.');
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
        } catch (error) {
            setRokuGenerationError(error instanceof Error ? error.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingRoku(false);
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
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" />
                    <path d="M10 12a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                )}
              </button>
            </div>
            {loginError && <p className="mt-2 text-sm text-red-500">{loginError}</p>}
             <button type="submit" className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
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
  
  const isDemoMode = dataSource === 'fallback';

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
  }
  
  const movieValues = Object.values(movies);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold">Crate TV Admin</h1>
        <div className="flex items-center gap-4">
           {saveStatus !== 'idle' && (
             <div className={`text-sm px-3 py-1 rounded-md ${saveStatus === 'saving' ? 'bg-yellow-600 animate-pulse' : saveStatus === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'success' && 'Saved!'}
                {saveStatus === 'error' && `Error: ${saveError}`}
             </div>
           )}
          <button onClick={handleLogout} className="text-sm text-gray-300 hover:text-white">Logout</button>
        </div>
      </header>

      {isDemoMode && (
          <div className="bg-red-800 text-white p-4 text-center border-b-2 border-red-600">
              <h2 className="font-bold text-lg">⚠️ Local-Only Demo Mode Activated</h2>
              <p className="text-sm max-w-4xl mx-auto">
                  The admin panel could not connect to the Firebase database. All changes made here will be temporary and lost on refresh.
                  This usually happens when server environment variables are missing or incorrect in your deployment settings (e.g., on Vercel).
              </p>
              
              {connectionError && (
                  <div className="mt-3 bg-red-900/70 p-3 rounded-md text-left max-w-3xl mx-auto">
                      <p className="font-bold text-sm text-red-200">Debugging Information:</p>
                      <pre className="text-xs whitespace-pre-wrap font-mono text-red-200">{connectionError}</pre>
                  </div>
              )}
              
              <div className="mt-4 text-left max-w-3xl mx-auto bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <h3 className="font-bold text-base text-white mb-2">How to Fix This</h3>
                  <p className="text-sm text-gray-300 mb-3">Please go to your project settings on Vercel (or your hosting provider) and ensure the following environment variables are correctly set:</p>
                  <ul className="text-xs font-mono text-yellow-300 list-disc list-inside space-y-1">
                      <li>FIREBASE_API_KEY</li>
                      <li>FIREBASE_AUTH_DOMAIN</li>
                      <li>FIREBASE_PROJECT_ID</li>
                      <li>FIREBASE_STORAGE_BUCKET</li>
                      <li>FIREBASE_MESSAGING_SENDER_ID</li>
                      <li>FIREBASE_APP_ID</li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-3">After adding or updating the variables, you must redeploy your project for the changes to take effect.</p>
              </div>
          </div>
      )}

      <main className="p-4 sm:p-8">
        {selectedMovie ? (
          <div className="bg-gray-800 p-6 rounded-lg">
            <MovieEditor 
              movie={selectedMovie} 
              onSave={handleSaveMovie} 
              onCancel={handleCancel}
              onDelete={handleDeleteMovie}
            />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('movies')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'movies' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Movies
                        </button>
                        <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Categories
                        </button>
                        <button onClick={() => setActiveTab('content')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'content' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Site Content
                        </button>
                        <button onClick={() => setActiveTab('festival')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'festival' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Film Festival
                        </button>
                        <button onClick={() => setActiveTab('tools')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tools' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Tools
                        </button>
                        <button onClick={() => navigate('/analytics')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Analytics
                        </button>
                    </nav>
                </div>
                
                 <div className="relative">
                    <button 
                      onClick={handlePublish}
                      disabled={isDemoMode || publishStatus === 'publishing'}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-md transition-colors"
                      title={isDemoMode ? "Publishing is disabled in local-only demo mode." : ""}
                    >
                      {publishStatus === 'publishing' ? 'Publishing...' : 'Publish to Live Site'}
                    </button>
                    {publishStatus === 'error' && <p className="text-red-500 text-xs mt-1 absolute right-0">{publishError}</p>}
                    {publishStatus === 'success' && <p className="text-green-500 text-xs mt-1 absolute right-0">Published successfully!</p>}
                </div>
            </div>

            {activeTab === 'movies' && (
              <div>
                  <button onClick={handleAddNewMovie} disabled={isDemoMode} className="mb-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                      + Add New Movie
                  </button>
                  {movieValues.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {movieValues.sort((a: Movie, b: Movie) => (a.title || '').localeCompare(b.title || '')).map((movie: Movie) => (
                              <div key={movie.key} onClick={() => handleSelectMovie(movie)} className="cursor-pointer group">
                                  <img src={movie.poster} alt={movie.title} className="w-full aspect-[3/4] object-cover rounded-md group-hover:ring-2 ring-red-500 transition"/>
                                  <p className="text-sm mt-2 text-gray-300 group-hover:text-white">{movie.title}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-800/50 rounded-lg">
                        <h3 className="text-xl font-bold text-white">No Movies Found</h3>
                        <p className="text-gray-400 mt-2">
                            There are no movies in your draft collection. Click "+ Add New Movie" to get started.
                        </p>
                    </div>
                  )}
              </div>
            )}
            
            {activeTab === 'categories' && festivalConfig && (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <CategoryEditor 
                        initialCategories={categories}
                        allMovies={Object.values(movies)}
                        onSave={handleSaveCategories}
                    />
                </div>
            )}
            
            {activeTab === 'content' && aboutData && (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <AboutEditor 
                        initialData={aboutData}
                        onSave={handleSaveAboutData}
                    />
                </div>
            )}

            {activeTab === 'festival' && festivalConfig && (
                <div className="bg-gray-800 p-6 rounded-lg">
                    <FestivalEditor 
                        data={festivalData}
                        config={festivalConfig}
                        allMovies={movies}
                        onDataChange={setFestivalData}
                        onConfigChange={setFestivalConfig}
                        onSave={handleSaveFestival}
                        onPublishLiveStatus={handleSetLiveStatus}
                    />
                </div>
            )}
            
            {activeTab === 'tools' && (
                 <div className="space-y-8">
                    <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                        <h2 className="text-2xl font-bold text-purple-400 mb-3">Automated Roku Channel Packager</h2>
                        <p className="text-sm text-gray-400 mb-4 max-w-3xl">
                        Generate a complete, ready-to-upload Roku channel ZIP file. The channel will be automatically configured to pull movie data from your live website, ensuring they always stay in sync.
                        </p>
                        <button
                        onClick={handleGenerateRokuPackage}
                        disabled={isGeneratingRoku}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-md transition-colors"
                        >
                        {isGeneratingRoku ? 'Generating...' : 'Generate & Download Roku ZIP'}
                        </button>
                        {rokuGenerationError && <p className="text-red-500 text-sm mt-2">{rokuGenerationError}</p>}
                    </div>

                    <FallbackGenerator
                        movies={movies}
                        categories={categories}
                        festivalData={festivalData}
                        festivalConfig={festivalConfig}
                        aboutData={aboutData}
                    />
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
