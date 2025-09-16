import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig } from './types.ts';
import { fetchAndCacheLiveData, invalidateCache } from './services/dataService.ts';
import MovieEditor from './components/MovieEditor.tsx';
import CategoryEditor from './components/CategoryEditor.tsx';
import FestivalEditor from './components/FestivalEditor.tsx';
import LoadingSpinner from './components/LoadingSpinner.tsx';
import Footer from './components/Footer.tsx';

type AdminTab = 'movies' | 'categories' | 'festival' | 'sales';

const AdminPage: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Data states
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig>({ title: '', description: '' });

    // UI states
    const [activeTab, setActiveTab] = useState<AdminTab>('movies');
    const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
    const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
    const [publishError, setPublishError] = useState('');
    
    // Permission states
    const [isDeveloper, setIsDeveloper] = useState(false);
    const [hasElevatedPrivileges, setHasElevatedPrivileges] = useState(false);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLoginError('');

        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Incorrect password.');
            }
            
            const { isDeveloper, hasElevatedPrivileges } = await response.json();
            setIsDeveloper(isDeveloper);
            setHasElevatedPrivileges(hasElevatedPrivileges);

            sessionStorage.setItem('adminPassword', password);
            setIsLoggedIn(true);
        } catch (error) {
            setLoginError(error instanceof Error ? error.message : 'Login failed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            invalidateCache();
            const { data } = await fetchAndCacheLiveData();
            setMovies(data.movies);
            setCategories(data.categories);
            setFestivalData(data.festivalData);
            setFestivalConfig(data.festivalConfig);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            setLoginError("Could not load data. Check console for details.");
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        if (storedPassword) {
            setPassword(storedPassword);
            // Re-validate password on page load
            const revalidate = async () => {
                const res = await fetch('/api/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: storedPassword }),
                });
                if(res.ok) {
                    const { isDeveloper, hasElevatedPrivileges } = await res.json();
                    setIsDeveloper(isDeveloper);
                    setHasElevatedPrivileges(hasElevatedPrivileges);
                    setIsLoggedIn(true);
                } else {
                    sessionStorage.removeItem('adminPassword');
                }
            };
            revalidate();
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchData();
        }
    }, [isLoggedIn, fetchData]);

    const handlePublish = async (updatedData?: any, successMessage = 'Data published successfully.') => {
        setPublishStatus('publishing');
        setPublishError('');
        const adminPassword = sessionStorage.getItem('adminPassword');

        try {
            const dataToPublish = updatedData || {
                movies,
                categories,
                festivalData,
                festivalConfig,
            };
            
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, data: dataToPublish }),
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Failed to publish data.');
            }
            setPublishStatus('success');
            setTimeout(() => setPublishStatus('idle'), 2000);

        } catch (error) {
            setPublishStatus('error');
            setPublishError(error instanceof Error ? error.message : 'An unknown error occurred.');
        }
    };

    const handleSaveMovie = (movie: Movie) => {
        const newMovies = { ...movies, [movie.key]: movie };
        setMovies(newMovies);
        setEditingMovie(null);
        handlePublish({ movies: newMovies, categories, festivalData, festivalConfig }, 'Movie saved successfully.');
    };
    
    const handleDeleteMovie = (movieKey: string) => {
        if (window.confirm(`Are you sure you want to delete the movie "${movies[movieKey].title}"? This action cannot be undone.`)) {
            const newMovies = { ...movies };
            delete newMovies[movieKey];
            
            const newCategories = { ...categories };
            Object.keys(newCategories).forEach(catKey => {
                newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter(key => key !== movieKey);
            });
            
            setMovies(newMovies);
            setCategories(newCategories);
            setEditingMovie(null);
            handlePublish({ movies: newMovies, categories: newCategories, festivalData, festivalConfig }, 'Movie deleted successfully.');
        }
    };

    const handleAddNewMovie = () => {
        const newMovie: Movie = {
            key: `newmovie${Date.now()}`,
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
        setActiveTab('movies');
    };
    
    const handleSaveCategories = (newCategories: Record<string, Category>) => {
        setCategories(newCategories);
        handlePublish({ movies, categories: newCategories, festivalData, festivalConfig }, 'Categories saved successfully.');
    };
    
    const handleSaveFestival = (newFestivalData: FestivalDay[], newFestivalConfig: FestivalConfig) => {
        setFestivalData(newFestivalData);
        setFestivalConfig(newFestivalConfig);
        handlePublish({ movies, categories, festivalData: newFestivalData, festivalConfig: newFestivalConfig }, 'Festival data saved successfully.');
    };
    
    const handlePublishLiveStatus = async (isLive: boolean) => {
        const newConfig = { ...festivalConfig, isFestivalLive: isLive };
        setFestivalConfig(newConfig);
        await handlePublish({ movies, categories, festivalData, festivalConfig: newConfig }, `Festival status set to ${isLive ? 'LIVE' : 'OFFLINE'}.`);
    };

    if (!isLoggedIn) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="w-full max-w-sm bg-gray-800 p-8 rounded-lg shadow-lg">
                    <h1 className="text-3xl font-bold text-center mb-6 text-red-400">Admin Login</h1>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                         <button type="submit" disabled={isLoading} className="submit-btn w-full">
                            {isLoading ? 'Logging In...' : 'Login'}
                        </button>
                        {loginError && <p className="text-red-500 text-sm text-center mt-4">{loginError}</p>}
                    </form>
                </div>
            </div>
        );
    }
    
    if (isLoadingData) {
        return <LoadingSpinner />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200">
            <header className="bg-gray-800 p-4 flex justify-between items-center shadow-md">
                <h1 className="text-xl font-bold text-red-400">Crate TV Admin</h1>
                <div>
                     <button
                        onClick={() => handlePublish()}
                        disabled={publishStatus === 'publishing'}
                        className={`font-bold py-2 px-5 rounded-md transition-colors text-sm ${
                           publishStatus === 'publishing' ? 'bg-yellow-600' :
                           publishStatus === 'success' ? 'bg-green-600' :
                           publishStatus === 'error' ? 'bg-red-600' :
                           'bg-blue-600 hover:bg-blue-700'
                        }`}
                     >
                        {publishStatus === 'publishing' ? 'Publishing...' : 
                         publishStatus === 'success' ? 'Published!' :
                         publishStatus === 'error' ? 'Error!' :
                         'Publish All Changes'}
                     </button>
                </div>
            </header>
            
            <main className="p-4 sm:p-6 lg:p-8">
                {publishStatus === 'error' && <div className="bg-red-800 text-red-200 p-3 rounded-md mb-4 text-sm">{publishError}</div>}
                
                <div className="flex border-b border-gray-700 mb-6">
                    <button onClick={() => setActiveTab('movies')} className={`tab ${activeTab === 'movies' && 'tab-active'}`}>Movies</button>
                    <button onClick={() => setActiveTab('categories')} className={`tab ${activeTab === 'categories' && 'tab-active'}`}>Categories</button>
                    {hasElevatedPrivileges && <button onClick={() => setActiveTab('festival')} className={`tab ${activeTab === 'festival' && 'tab-active'}`}>Festival</button>}
                </div>

                {editingMovie ? (
                    <MovieEditor
                        movie={editingMovie}
                        onSave={handleSaveMovie}
                        onCancel={() => setEditingMovie(null)}
                        onDelete={handleDeleteMovie}
                    />
                ) : (
                    <>
                        {activeTab === 'movies' && (
                             <div>
                                 <div className="flex justify-between items-center mb-4">
                                     <h2 className="text-xl sm:text-2xl font-bold text-red-400">Manage Movies</h2>
                                     <button onClick={handleAddNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">Add New Movie</button>
                                 </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {Object.values(movies).sort((a,b) => a.title.localeCompare(b.title)).map(movie => (
                                        <div key={movie.key} onClick={() => setEditingMovie(movie)} className="cursor-pointer bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition">
                                            <img src={movie.poster} alt={movie.title} className="w-full aspect-[3/4] object-cover rounded-md" />
                                            <p className="text-xs text-center mt-2 truncate">{movie.title}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}
                        {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={handleSaveCategories} />}
                        {activeTab === 'festival' && hasElevatedPrivileges && <FestivalEditor initialData={festivalData} initialConfig={festivalConfig} allMovies={movies} onSave={handleSaveFestival} onPublishLiveStatus={handlePublishLiveStatus} />}
                    </>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default AdminPage;
