import React, { useState, useEffect, useCallback } from 'react';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import FestivalEditor from './components/FestivalEditor';
import AboutEditor from './components/AboutEditor';
import FallbackGenerator from './components/FallbackGenerator';
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import AnalyticsPage from './components/AnalyticsPage'; // Reusing for admin view
import { Movie, Category, FestivalDay, FestivalConfig, AboutData, ActorSubmission } from './types';
import { listenToAllAdminData, saveMovie, deleteMovie, saveCategories, saveFestivalConfig, saveFestivalDays, saveAboutData, approveActorSubmission, rejectActorSubmission } from './services/firebaseService';
import LoadingSpinner from './components/LoadingSpinner';

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('movies');
    
    // Data state
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [actorSubmissions, setActorSubmissions] = useState<ActorSubmission[]>([]);
    
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [dataStatus, setDataStatus] = useState<{ source: string, error?: string }>({ source: 'loading' });
    const [refreshKey, setRefreshKey] = useState(0);

    const loadAdminData = useCallback(() => {
        setIsLoading(true);
        const handleDataUpdate = (result: { data: any, source: string, error?: string }) => {
            setMovies(result.data.movies || {});
            setCategories(result.data.categories || {});
            setFestivalData(result.data.festivalData || []);
            setFestivalConfig(result.data.festivalConfig || null);
            setAboutData(result.data.aboutData || null);
            setActorSubmissions(result.data.actorSubmissions || []);
            setDataStatus({ source: result.source, error: result.error });
            setIsLoading(false);
        };
        
        const promise = listenToAllAdminData(handleDataUpdate);
        
        return () => {
            promise.then(unsubscribe => unsubscribe());
        };
    }, []);

    useEffect(() => {
        const adminAuth = sessionStorage.getItem('isAdminAuthenticated');
        if (adminAuth === 'true') {
            setIsAuthenticated(true);
        } else {
            setIsLoading(false); // If not auth'd, stop loading and show login
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        return loadAdminData();
    }, [isAuthenticated, refreshKey, loadAdminData]);

    const forceRefresh = () => {
        console.log("Forcing data refresh...");
        setRefreshKey(k => k + 1);
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
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                sessionStorage.setItem('adminPassword', password); // Store password for API calls
                setIsAuthenticated(true);
            } else {
                const data = await response.json();
                setError(data.error || 'Incorrect password.');
            }
        } catch (err) {
            setError('An error occurred during login.');
        }
    };

    const handleSaveMovie = async (movie: Movie) => {
        setIsSaving(true);
        try {
            await saveMovie(movie);
            setSelectedMovie(null);
        } catch (error) {
            console.error("Failed to save movie:", error);
            alert("Error saving movie. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteMovie = async (movieKey: string) => {
        if (window.confirm(`Are you sure you want to delete this movie? This action cannot be undone.`)) {
            setIsSaving(true);
            try {
                await deleteMovie(movieKey);
                setSelectedMovie(null);
            } catch (error) {
                console.error("Failed to delete movie:", error);
                alert("Error deleting movie. Check console for details.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleSaveCategories = async (newCategories: Record<string, Category>) => {
        setIsSaving(true);
        try {
            await saveCategories(newCategories);
        } catch (error) {
            console.error("Failed to save categories:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // Step 1: Save all data to Firebase (this part is assumed to be working)
            await saveCategories(categories);
            if (festivalConfig) await saveFestivalConfig(festivalConfig);
            await saveFestivalDays(festivalData);
            if(aboutData) await saveAboutData(aboutData);
            
            // Step 2: Publish the current state to S3 for the live site
            const password = sessionStorage.getItem('adminPassword');
            if (!password) throw new Error("Admin password not found in session.");

            // Construct the payload for the public live-data.json, excluding sensitive info
            const liveDataPayload = { movies, categories, festivalConfig, festivalData, aboutData };
            
            const publishResponse = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, data: liveDataPayload })
            });

            if (!publishResponse.ok) {
                const errorData = await publishResponse.json();
                throw new Error(errorData.error || "Failed to publish data to live site.");
            }

            // Step 3: Broadcast update to other open admin tabs
            const channel = new BroadcastChannel('cratetv-data-channel');
            channel.postMessage({ type: 'DATA_PUBLISHED', payload: { ...liveDataPayload, actorSubmissions } });
            channel.close();

            alert('All changes saved to database and PUBLISHED to the live site!');
        } catch (error) {
            console.error("Failed to save and publish all data:", error);
            alert(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddNewMovie = () => {
        const newMovie: Movie = {
            key: `newmovie${Date.now()}`,
            title: '',
            synopsis: '',
            cast: [],
            director: '',
            producers: '',
            trailer: '',
            fullMovie: '',
            poster: '',
            tvPoster: '',
            likes: 0
        };
        setSelectedMovie(newMovie);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                    <h1 className="text-3xl font-bold text-center text-white mb-6">Admin Login</h1>
                    <form onSubmit={handleLogin}>
                        <div className="relative mb-4">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        <path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
                        <button type="submit" className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-md transition">
                            Enter
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-gray-900 min-h-screen text-gray-200 p-4 sm:p-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-4 sm:mb-0">Crate TV Admin Panel</h1>
                <div className="flex items-center gap-4">
                     <span className={`text-xs px-2 py-1 rounded-full ${dataStatus.source === 'firebase' ? 'bg-green-800 text-green-300' : 'bg-yellow-800 text-yellow-300'}`}>
                        Data: {dataStatus.source.toUpperCase()}
                    </span>
                     <button onClick={forceRefresh} title="Force a refresh of all data from the database" className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-md transition-colors text-xs">
                        Force Refresh
                    </button>
                    <button onClick={handleSaveAll} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-5 rounded-md transition-colors">
                        {isSaving ? 'Publishing...' : 'Save & Publish All'}
                    </button>
                </div>
            </header>
            
            {dataStatus.error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-6">
                    <strong>Warning:</strong> {dataStatus.error} The panel may be in fallback mode.
                </div>
            )}
            
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
                <TabButton tabName="movies" label="Movies" />
                <TabButton tabName="categories" label="Categories" />
                <TabButton tabName="festival" label="Festival" />
                <TabButton tabName="about" label="About Page" />
                <TabButton tabName="submissions" label="Submissions" />
                <TabButton tabName="analytics" label="Analytics" />
                <TabButton tabName="tools" label="Tools" />
            </div>

            <main>
                {activeTab === 'movies' && (
                    <div>
                        {selectedMovie ? (
                            <MovieEditor movie={selectedMovie} onSave={handleSaveMovie} onCancel={() => setSelectedMovie(null)} onDelete={handleDeleteMovie} />
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-2xl font-bold">All Movies ({Object.keys(movies).length})</h2>
                                    <button onClick={handleAddNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm">+ Add New Movie</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {/* FIX: Explicitly cast the parameters to type 'Movie' to resolve TypeScript inference errors. */}
                                    {Object.values(movies).sort((a: Movie, b: Movie) => a.title.localeCompare(b.title)).map((movie: Movie) => (
                                        <div key={movie.key} onClick={() => setSelectedMovie(movie)} className="cursor-pointer bg-gray-800 p-2 rounded-lg hover:bg-gray-700">
                                            <img src={movie.poster} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md" />
                                            <p className="text-xs mt-2 text-center truncate">{movie.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'categories' && (
                    <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={handleSaveCategories} />
                )}
                
                {activeTab === 'festival' && festivalConfig && (
                    <FestivalEditor 
                        data={festivalData}
                        config={festivalConfig}
                        allMovies={movies}
                        onDataChange={setFestivalData}
                        onConfigChange={setFestivalConfig}
                        onSave={handleSaveAll}
                    />
                )}
                
                {activeTab === 'about' && aboutData && (
                    <AboutEditor initialData={aboutData} onSave={saveAboutData} />
                )}

                {activeTab === 'submissions' && (
                    <ActorSubmissionsTab submissions={actorSubmissions} allMovies={movies} onApprove={approveActorSubmission} onReject={rejectActorSubmission} />
                )}
                
                {activeTab === 'analytics' && <AnalyticsPage allMovies={movies} />}

                {activeTab === 'tools' && (
                    <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />
                )}
            </main>
        </div>
    );
};

export default AdminPage;