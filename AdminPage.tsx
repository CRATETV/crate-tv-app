import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig } from './types.ts';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import MovieEditor from './components/MovieEditor.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';

type AdminView = 'dashboard' | 'movies' | 'festival';

const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    
    // User roles
    const [isDeveloper, setIsDeveloper] = useState(false);

    // Data state
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '', isFestivalLive: false });

    // UI State
    const [currentView, setCurrentView] = useState<AdminView>('dashboard');
    const [selectedMovieKey, setSelectedMovieKey] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const checkLogin = async () => {
            if (sessionStorage.getItem('adminLoggedIn') === 'true') {
                setIsLoggedIn(true);
                setIsDeveloper(sessionStorage.getItem('isDeveloper') === 'true');
                await loadInitialData();
            } else {
                setIsLoading(false);
            }
        };
        checkLogin();
    }, []);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const { data: liveData } = await fetchAndCacheLiveData();
            setMovies(liveData.movies);
            setCategories(liveData.categories);
            setFestivalData(liveData.festivalData);
            setFestivalConfig(liveData.festivalConfig);
        } catch (err) {
            setError('Failed to load live data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    sessionStorage.setItem('adminPassword', password);
                    sessionStorage.setItem('isDeveloper', data.isDeveloper ? 'true' : 'false');
                    
                    setIsLoggedIn(true);
                    setIsDeveloper(data.isDeveloper);
                    await loadInitialData();
                } else {
                    setError(data.error || 'Login failed');
                }
            } else {
                const data = await response.json();
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        setIsLoggedIn(false);
        setIsDeveloper(false);
        setPassword('');
    };

    const publishData = async (dataToPublish?: { festivalConfig: FestivalConfig }) => {
        setIsPublishing(true);
        setPublishSuccess(false);
        setError('');
        try {
            const adminPassword = sessionStorage.getItem('adminPassword');
            if (!adminPassword) throw new Error("Authentication error. Please log out and log in again.");
            
            const payload = dataToPublish ? 
                { ...dataToPublish, movies, categories, festivalData } : 
                { movies, categories, festivalData, festivalConfig };

            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, data: payload })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to publish data.');
            }
            
            invalidateCache(); // Clear local cache to fetch new data next time
            
            // This channel notifies other open tabs (like the main site) to refetch data.
            const updateChannel = new BroadcastChannel('cratetv_data_update');
            updateChannel.postMessage('data_updated');
            updateChannel.close();

            setPublishSuccess(true);
            setTimeout(() => setPublishSuccess(false), 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handlePublishFestivalStatus = async (isLive: boolean) => {
        const newConfig = { ...festivalConfig, isFestivalLive: isLive };
        // FIX: Corrected function call from 'setConfig' to 'setFestivalConfig'.
        setFestivalConfig(newConfig);
        await publishData({ festivalConfig: newConfig });
    };

    const handleMovieSave = (movie: Movie) => {
        setMovies(prev => ({ ...prev, [movie.key]: movie }));
        setSelectedMovieKey(null); // Return to the movie list
    };

    const handleMovieDelete = (movieKey: string) => {
        if (window.confirm(`Are you sure you want to permanently delete the movie "${movies[movieKey]?.title}"?`)) {
            setMovies(prev => {
                const newMovies = { ...prev };
                delete newMovies[movieKey];
                return newMovies;
            });
            // Also remove from all categories
            setCategories(prev => {
                const newCategories = { ...prev };
                for (const catKey in newCategories) {
                    newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter(key => key !== movieKey);
                }
                return newCategories;
            });
            setSelectedMovieKey(null);
        }
    };
    
    const handleAddNewMovie = () => {
        const newMovieKey = `newmovie${Date.now()}`;
        const newMovie: Movie = {
            key: newMovieKey,
            title: 'New Movie Title',
            synopsis: '',
            cast: [],
            director: '',
            trailer: '',
            fullMovie: '',
            poster: '',

            tvPoster: '',
            likes: 0
        };
        setMovies(prev => ({ ...prev, [newMovieKey]: newMovie }));
        setSelectedMovieKey(newMovieKey);
    };

    const handleDownloadConstants = () => {
        const content = `
import { Category, Movie, FestivalDay, FestivalConfig } from './types.ts';

export const festivalConfigData: FestivalConfig = ${JSON.stringify(festivalConfig, null, 2)};

export const categoriesData: Record<string, Category> = ${JSON.stringify(categories, null, 2)};

export const moviesData: Record<string, Movie> = ${JSON.stringify(movies, null, 2)};

export const festivalData: FestivalDay[] = ${JSON.stringify(festivalData, null, 2)};
        `.trim();
        
        const blob = new Blob([content], { type: 'text/typescript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'constants.ts';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const filteredMovies = Object.values(movies).filter(movie => movie.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const renderCurrentView = () => {
        if (selectedMovieKey) {
            return (
                <MovieEditor 
                    movie={movies[selectedMovieKey]}
                    onSave={handleMovieSave}
                    onCancel={() => setSelectedMovieKey(null)}
                    onDelete={handleMovieDelete}
                />
            );
        }
        
        switch (currentView) {
            case 'movies':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-red-400">Manage Films</h2>
                            <button onClick={handleAddNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">+ Add New Film</button>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search films..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full mb-4 bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                        />
                        <div className="space-y-2">
                            {filteredMovies.map(movie => (
                                <div key={movie.key} onClick={() => setSelectedMovieKey(movie.key)} className="bg-gray-800 p-3 rounded-md hover:bg-gray-700 cursor-pointer flex justify-between items-center">
                                    <span>{movie.title}</span>
                                    <span className="text-xs text-gray-500">{movie.key}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'festival':
                return (
                    <FestivalEditor 
                        initialData={festivalData}
                        initialConfig={festivalConfig}
                        allMovies={movies}
                        onSave={(newData, newConfig) => {
                            setFestivalData(newData);
                            // FIX: Corrected function call from 'setConfig' to 'setFestivalConfig'.
                            setFestivalConfig(newConfig);
                        }}
                        onPublishLiveStatus={handlePublishFestivalStatus}
                    />
                );
            case 'dashboard':
            default:
                return (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-4">Content Management</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div onClick={() => setCurrentView('festival')} className="bg-purple-800/50 hover:bg-purple-700/60 p-6 rounded-lg cursor-pointer transition-all border border-purple-700">
                                    <h3 className="text-2xl font-bold text-purple-300">Manage Festival</h3>
                                    <p className="text-purple-400 mt-2">Organize days, create film blocks, and set the festival live.</p>
                                </div>
                                <div onClick={() => setCurrentView('movies')} className="bg-red-800/50 hover:bg-red-700/60 p-6 rounded-lg cursor-pointer transition-all border border-red-700">
                                    <h3 className="text-2xl font-bold text-red-300">Manage Films</h3>
                                    <p className="text-red-400 mt-2">Add, edit, or delete individual films and their details.</p>
                                </div>
                            </div>
                        </div>

                        {isDeveloper && (
                            <div>
                                <h2 className="text-3xl font-bold text-white mb-4">Developer Tools</h2>
                                 <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                                    <h3 className="text-2xl font-bold text-gray-300">Live Data Backup</h3>
                                    <p className="text-gray-400 mt-2 mb-4">Download the current live data state as a `constants.ts` file. This is useful for development or as a backup.</p>
                                    <button onClick={handleDownloadConstants} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Download constants.ts</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
                    <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
                    <div className="mb-4 relative">
                        <label htmlFor="password-input" className="block text-sm font-medium text-gray-400">Password</label>
                        <input
                            id="password-input"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-gray-400 hover:text-white"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A10.003 10.003 0 00.458 10c1.274 4.057 5.065 7 9.542 7 1.852 0 3.572-.506 5.034-1.398l-2.652-2.653z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition">
                        Login
                    </button>
                </form>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <header className="bg-gray-800 p-4 flex justify-between items-center sticky top-0 z-50 border-b border-gray-700">
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => publishData()}
                        disabled={isPublishing}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold py-2 px-5 rounded-md transition-colors"
                    >
                        {isPublishing ? 'Publishing...' : (publishSuccess ? 'Published!' : 'Publish Live Data')}
                    </button>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-white">Logout</button>
                </div>
            </header>
            <main className="p-4 md:p-8">
                {currentView !== 'dashboard' && !selectedMovieKey && (
                    <button onClick={() => setCurrentView('dashboard')} className="mb-6 text-red-400 hover:text-red-300">
                        &larr; Back to Dashboard
                    </button>
                )}
                 {selectedMovieKey && (
                    <button onClick={() => setSelectedMovieKey(null)} className="mb-6 text-red-400 hover:text-red-300">
                        &larr; Back to Film List
                    </button>
                )}
                {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 border border-red-800">{error}</div>}
                {renderCurrentView()}
            </main>
        </div>
    );
};

export default AdminPage;