import React, { useState, useEffect } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig, FilmBlock } from './types.ts';
import MovieEditor from './components/MovieEditor.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import LoadingSpinner from './components/LoadingSpinner.tsx';

type AdminView = 'dashboard' | 'movies' | 'festival';

const AdminPage: React.FC = () => {
    // Auth state
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Permission state
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [hasElevatedPrivileges, setHasElevatedPrivileges] = useState(false);

    // Data state
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '' });
    const [isLoadingData, setIsLoadingData] = useState(true);

    // UI State
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishMessage, setPublishMessage] = useState({ type: '', text: '' });
    const [dataDirty, setDataDirty] = useState(false);

    // Check session for login status on mount
    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        const storedIsDev = sessionStorage.getItem('isDeveloper') === 'true';
        const storedIsElevated = sessionStorage.getItem('hasElevatedPrivileges') === 'true';
        if (storedPassword) {
            setIsLoggedIn(true);
            setIsDeveloper(storedIsDev);
            setHasElevatedPrivileges(storedIsElevated);
        }
    }, []);

    // Fetch data once logged in
    useEffect(() => {
        if (isLoggedIn) {
            const loadAdminData = async () => {
                setIsLoadingData(true);
                invalidateCache();
                const { data } = await fetchAndCacheLiveData();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                setFestivalData(data.festivalData || []);
                setFestivalConfig(data.festivalConfig || { title: '', description: '' });
                setIsLoadingData(false);
                setDataDirty(false); // Reset dirty state on data load
            };
            loadAdminData();
        }
    }, [isLoggedIn]);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setAuthError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                sessionStorage.setItem('adminPassword', password);
                sessionStorage.setItem('isDeveloper', data.isDeveloper ? 'true' : 'false');
                sessionStorage.setItem('hasElevatedPrivileges', data.hasElevatedPrivileges ? 'true' : 'false');
                setIsLoggedIn(true);
                setIsDeveloper(data.isDeveloper);
                setHasElevatedPrivileges(data.hasElevatedPrivileges);
            } else {
                setAuthError(data.error || 'Login failed.');
            }
        } catch (error) {
            setAuthError('An error occurred. Please try again.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        setIsLoggedIn(false);
        setPassword('');
        setCurrentView('dashboard');
    };

    const handleSaveMovie = (movieToSave: Movie) => {
        setMovies(prev => ({ ...prev, [movieToSave.key]: movieToSave }));
        setEditingMovie(null);
        setCurrentView('dashboard');
        setDataDirty(true);
    };

    const handleDeleteMovie = (movieKey: string) => {
        if (window.confirm(`Are you sure you want to delete the movie with key "${movieKey}"? This action cannot be undone.`)) {
            setMovies(prevMovies => {
                const newMovies = { ...prevMovies };
                delete newMovies[movieKey];
                return newMovies;
            });

            setCategories(prevCategories => {
                const newCategories = JSON.parse(JSON.stringify(prevCategories)); // Deep copy
                Object.keys(newCategories).forEach(catKey => {
                    newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
                });
                return newCategories;
            });
            
            setFestivalData(prevFestivalData => {
                const newFestivalData = JSON.parse(JSON.stringify(prevFestivalData));
                newFestivalData.forEach((day: FestivalDay) => {
                    day.blocks.forEach((block: FilmBlock) => {
                        block.movieKeys = block.movieKeys.filter((key: string) => key !== movieKey);
                    });
                });
                return newFestivalData;
            });

            setDataDirty(true);
            setEditingMovie(null);
            setCurrentView('movies');
        }
    };

    const handleAddNewMovie = () => {
        const newKey = `newmovie${Date.now()}`;
        const newMovie: Movie = {
            key: newKey,
            title: '',
            synopsis: '',
            cast: [],
            director: '',
            trailer: '',
            fullMovie: '',
            poster: '',
            tvPoster: '',
            likes: 0,
        };
        setEditingMovie(newMovie);
    };

    const handleSaveFestival = (newData: FestivalDay[], newConfig: FestivalConfig) => {
        setFestivalData(newData);
        setFestivalConfig(newConfig);
        setDataDirty(true);
    };
    
    const publishData = async (dataToPublish: any) => {
        setIsPublishing(true);
        setPublishMessage({ type: '', text: '' });
        try {
            const adminPassword = sessionStorage.getItem('adminPassword');
            if (!adminPassword) throw new Error("Authentication error. Please log out and log back in.");
            
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, data: dataToPublish }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to publish data.');
            
            setPublishMessage({ type: 'success', text: 'Data published successfully!' });
            setDataDirty(false);

            invalidateCache();
            const broadcastChannel = new BroadcastChannel('cratetv-data-update');
            broadcastChannel.postMessage('refresh');
            broadcastChannel.close();

        } catch (error) {
            setPublishMessage({ type: 'error', text: error instanceof Error ? error.message : "An unknown error occurred." });
        } finally {
            setIsPublishing(false);
            setTimeout(() => setPublishMessage({ type: '', text: '' }), 5000);
        }
    };
    
    const handlePublishAll = () => {
        const fullData = { movies, categories, festivalData, festivalConfig };
        publishData(fullData);
    };

    const handlePublishFestivalStatus = async (isLive: boolean) => {
        const newConfig = { ...festivalConfig, isFestivalLive: isLive };
        setFestivalConfig(newConfig);
        const fullData = { movies, categories, festivalData, festivalConfig: newConfig };
        await publishData(fullData);
    };

    const downloadConstants = () => {
        const content = `
import { Category, Movie, FestivalDay, FestivalConfig } from './types.ts';

export const festivalConfigData: FestivalConfig = ${JSON.stringify(festivalConfig, null, 2)};

export const categoriesData: Record<string, Category> = ${JSON.stringify(categories, null, 2)};

export const moviesData: Record<string, Movie> = ${JSON.stringify(movies, null, 2)};

export const festivalData: FestivalDay[] = ${JSON.stringify(festivalData, null, 2)};
        `.trim();

        const blob = new Blob([content], { type: 'text/typescript;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'constants.ts';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="w-full max-w-sm p-8 bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-6">Admin Login</h2>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4 relative">
                            <label className="block text-sm font-medium text-gray-400 mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            />
                             <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-white"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                               {showPassword ? (
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" /><path d="M10 17a9.95 9.95 0 01-4.6-1.272l-1.473-1.473a1 1 0 01-1.414-1.414l14-14a1 1 0 011.414 1.414l-1.473 1.473A9.95 9.95 0 0110 17z" /></svg>
                               ) : (
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                               )}
                            </button>
                        </div>
                        {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-red-800"
                        >
                            {isLoggingIn ? 'Logging In...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoadingData) {
        return <LoadingSpinner />;
    }

    const renderCurrentView = () => {
        if (editingMovie) {
            return <MovieEditor 
                movie={editingMovie} 
                onSave={handleSaveMovie} 
                onCancel={() => setEditingMovie(null)}
                onDelete={handleDeleteMovie}
            />;
        }

        switch (currentView) {
            case 'movies':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-red-400">Manage Films</h2>
                            <button onClick={handleAddNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">+ Add New Film</button>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-[60vh] overflow-y-auto">
                            {Object.values(movies).sort((a,b) => a.title.localeCompare(b.title)).map(movie => (
                                <div key={movie.key} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800">
                                    <div className="flex items-center gap-4">
                                        <img src={movie.poster} alt={movie.title} className="w-12 h-16 object-cover rounded-md bg-gray-700" />
                                        <span>{movie.title}</span>
                                    </div>
                                    <button onClick={() => setEditingMovie(movie)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md">Edit</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'festival':
                return hasElevatedPrivileges ? (
                    <FestivalEditor
                        initialData={festivalData}
                        initialConfig={festivalConfig}
                        allMovies={movies}
                        onSave={handleSaveFestival}
                        onPublishLiveStatus={handlePublishFestivalStatus}
                    />
                ) : (
                    <p className="text-yellow-400">You do not have permission to edit the festival.</p>
                );
            case 'dashboard':
            default:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div onClick={() => setCurrentView('movies')} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 hover:border-red-500 cursor-pointer transition-colors">
                                    <h3 className="text-xl font-bold text-red-400 mb-2">Manage Films</h3>
                                    <p className="text-gray-400">Add, edit, or delete films in the library.</p>
                                </div>
                                {hasElevatedPrivileges && (
                                    <div onClick={() => setCurrentView('festival')} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 hover:border-purple-500 cursor-pointer transition-colors">
                                        <h3 className="text-xl font-bold text-purple-400 mb-2">Manage Festival</h3>
                                        <p className="text-gray-400">Organize film blocks, set schedules, and take the festival live.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {isDeveloper && (
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-4">Developer Tools</h2>
                                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                                    <p className="text-gray-400 mb-4">Download a `constants.ts` file containing a snapshot of the current live data for local development.</p>
                                    <button onClick={downloadConstants} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                                        Download constants.ts
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };
    
    return (
        <div className="min-h-screen bg-black text-white p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 pb-4 border-b border-gray-700">
                    <div>
                        <h1 className="text-3xl font-bold">Crate TV Admin</h1>
                        <p className="text-gray-400">Content Management System</p>
                    </div>
                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                         {publishMessage.text && (
                            <div className={`p-2 rounded-md text-sm ${publishMessage.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                                {publishMessage.text}
                            </div>
                        )}
                        <button
                            onClick={handlePublishAll}
                            disabled={isPublishing || !dataDirty}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-md transition-colors"
                        >
                            {isPublishing ? 'Publishing...' : 'Publish Live Data'}
                        </button>
                        <button onClick={handleLogout} className="text-gray-400 hover:text-white transition">Logout</button>
                    </div>
                </header>
                
                <main>
                    {currentView !== 'dashboard' && !editingMovie && (
                         <button onClick={() => setCurrentView('dashboard')} className="mb-6 text-sm text-gray-400 hover:text-white">
                             &larr; Back to Dashboard
                         </button>
                    )}
                    {renderCurrentView()}
                </main>
            </div>
        </div>
    );
};

export default AdminPage;