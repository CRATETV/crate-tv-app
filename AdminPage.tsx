
import React, { useState, useEffect, useCallback } from 'react';
import { listenToAllAdminData, saveMovie, deleteMovie, saveCategories, saveFestivalConfig, saveFestivalDays, saveAboutData, approveActorSubmission, rejectActorSubmission, deleteMoviePipelineEntry } from './services/firebaseService';
import { Movie, Category, FestivalDay, FestivalConfig, AboutData, LiveData, ActorSubmission, PayoutRequest, MoviePipelineEntry } from './types';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import FestivalEditor from './components/FestivalEditor';
import AboutEditor from './components/AboutEditor';
import LoadingSpinner from './components/LoadingSpinner';
import FallbackGenerator from './components/FallbackGenerator';
import AnalyticsPage from './components/AnalyticsPage';
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import PayoutsTab from './components/PayoutsTab';
import EmailSender from './components/EmailSender';
import MoviePipelineTab from './components/MoviePipelineTab';
import TopFilmsTab from './components/TopFilmsTab';

type AdminRole = 'super_admin' | 'festival_admin' | 'collaborator' | null;

const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [role, setRole] = useState<AdminRole>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [data, setData] = useState<LiveData | null>(null);
    const [dbError, setDbError] = useState<string | null>(null);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    
    const [activeTab, setActiveTab] = useState('analytics');
    const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
    const [publishMessage, setPublishMessage] = useState('');

    useEffect(() => {
        const savedPassword = sessionStorage.getItem('adminPassword');
        const savedRole = sessionStorage.getItem('adminRole') as AdminRole;
        if (savedPassword && savedRole) {
            setPassword(savedPassword);
            setRole(savedRole);
            setIsLoggedIn(true);
            if (savedRole === 'festival_admin') {
                setActiveTab('festival'); // Set default tab to 'festival' for them
            }
        }
        setIsCheckingAuth(false);
    }, []);
    
    const getPayouts = async (adminPassword: string) => {
        const res = await fetch('/api/get-payouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPassword }),
        });
        if (!res.ok) throw new Error('Failed to fetch payouts');
        const data = await res.json();
        return data.payoutRequests;
    };

    const completePayout = async (requestId: string) => {
        const adminPassword = sessionStorage.getItem('adminPassword');
        await fetch('/api/complete-payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, password: adminPassword }),
        });
        // Re-fetch payouts
        const updatedPayouts = await getPayouts(adminPassword!);
        setPayouts(updatedPayouts);
    };

    const dataListenerCallback = useCallback((result: { data: LiveData, error?: string }) => {
        if (result.error) {
            setDbError(result.error);
        }
        setData(result.data);
        setIsLoadingData(false);
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            setIsLoadingData(true);
            const unsubscribePromise = listenToAllAdminData(dataListenerCallback);

            const fetchPayoutData = async () => {
                const adminPassword = sessionStorage.getItem('adminPassword');
                if (adminPassword) {
                    try {
                        const fetchedPayouts = await getPayouts(adminPassword);
                        setPayouts(fetchedPayouts);
                    } catch (err) {
                        console.error("Failed to fetch payouts", err);
                    }
                }
            };
            fetchPayoutData();
            
            return () => {
                unsubscribePromise.then(unsub => unsub());
            };
        }
    }, [isLoggedIn, dataListenerCallback]);
    
    const handlePublish = async () => {
        if (!data || !window.confirm("Are you sure you want to publish all current data to the live site? This will overwrite the existing live data.")) {
            return;
        }

        setPublishStatus('publishing');
        setPublishMessage('');
        const adminPassword = sessionStorage.getItem('adminPassword');

        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, data }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to publish.');
            
            // On successful publish, notify other tabs
            const channel = new BroadcastChannel('cratetv-data-channel');
            channel.postMessage({ type: 'DATA_PUBLISHED', payload: data });
            channel.close();

            setPublishStatus('success');
            setPublishMessage('Published successfully! Site is now live with your changes.');
        } catch (err) {
            setPublishStatus('error');
            setPublishMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setTimeout(() => setPublishStatus('idle'), 4000);
        }
    };


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                sessionStorage.setItem('adminPassword', password);
                sessionStorage.setItem('adminRole', result.role);
                setRole(result.role);
                setIsLoggedIn(true);
                if (result.role === 'festival_admin') {
                    setActiveTab('festival');
                }
            } else {
                throw new Error(result.error || 'Login failed.');
            }
        } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('adminPassword');
        sessionStorage.removeItem('adminRole');
        setIsLoggedIn(false);
        setRole(null);
        setPassword('');
    };

    const handleCreateNewMovie = () => {
        const newMovie: Movie = {
            key: `newmovie${Date.now()}`,
            title: '',
            synopsis: '',
            cast: [],
            director: '',
            trailer: '',
            fullMovie: '',
            poster: '',
            likes: 0
        };
        setSelectedMovie(newMovie);
        setActiveTab('movies');
    };

    const handleCreateMovieFromPipeline = async (item: MoviePipelineEntry) => {
         const newMovie: Movie = {
            key: `newmovie${Date.now()}`,
            title: item.title,
            synopsis: '',
            cast: item.cast.split(',').map(name => ({ name: name.trim(), photo: '', bio: '', highResPhoto: '' })),
            director: item.director,
            trailer: '',
            fullMovie: item.movieUrl,
            poster: item.posterUrl,
            likes: 0
        };
        setSelectedMovie(newMovie);
        setActiveTab('movies');
        
        // Automatically remove the item from the pipeline to prevent duplicate work
        try {
            await deleteMoviePipelineEntry(item.id);
        } catch (error) {
            console.error("Failed to remove item from pipeline after creation:", error);
            // Non-critical error, the main action (opening the editor) has already succeeded.
        }
    };

    const TabButton: React.FC<{ tabId: string; label: string; requiredRole?: AdminRole[] }> = ({ tabId, label, requiredRole }) => {
        if (requiredRole && role && !requiredRole.includes(role)) {
            return null;
        }
        return (
            <button
                onClick={() => { setSelectedMovie(null); setActiveTab(tabId); }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabId ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
            >
                {label}
            </button>
        );
    };

    if (isCheckingAuth) {
        return <LoadingSpinner />;
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-full max-w-sm">
                    <form onSubmit={handleLogin} className="bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                        <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Access</h1>
                        <div className="mb-4">
                            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
                                Password
                            </label>
                            <input
                                className="form-input"
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="******************"
                            />
                        </div>
                        {authError && <p className="text-red-500 text-xs italic mb-4">{authError}</p>}
                        <div className="flex items-center justify-between">
                            <button className="submit-btn w-full" type="submit">
                                Sign In
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoadingData || !data) {
        return <LoadingSpinner />;
    }

    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold text-red-500">Crate TV Admin</h1>
                        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
                    </div>
                    {(role === 'super_admin' || role === 'festival_admin') && (
                        <div className="flex items-center gap-2">
                             <button onClick={handlePublish} disabled={publishStatus === 'publishing'} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">
                                {publishStatus === 'publishing' ? 'Publishing...' : 'Publish Live Data'}
                            </button>
                            {publishMessage && <p className={`text-xs ${publishStatus === 'error' ? 'text-red-400' : 'text-green-400'}`}>{publishMessage}</p>}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                    <TabButton tabId="analytics" label="Analytics" requiredRole={['super_admin', 'festival_admin']} />
                    <TabButton tabId="top_films" label="Top Films" requiredRole={['super_admin', 'festival_admin']} />
                    {role !== 'festival_admin' && <>
                        <TabButton tabId="movies" label="Movies" requiredRole={['super_admin', 'collaborator']} />
                        <TabButton tabId="categories" label="Categories" requiredRole={['super_admin', 'collaborator']} />
                    </>}
                    <TabButton tabId="festival" label="Festival" requiredRole={['super_admin', 'festival_admin']} />
                    {role !== 'festival_admin' && <>
                        <TabButton tabId="submissions" label="Submissions" requiredRole={['super_admin']} />
                        <TabButton tabId="payouts" label="Payouts" requiredRole={['super_admin']} />
                    </>}
                    <TabButton tabId="pipeline" label="Pipeline" requiredRole={['super_admin', 'collaborator', 'festival_admin']} />
                    {role !== 'festival_admin' && <>
                        <TabButton tabId="about" label="About Page" requiredRole={['super_admin']} />
                        <TabButton tabId="tools" label="Tools" requiredRole={['super_admin']} />
                    </>}
                </div>
                
                {dbError && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{dbError}</div>}

                {activeTab === 'analytics' && <AnalyticsPage viewMode={role === 'festival_admin' ? 'festival' : 'full'} />}
                {activeTab === 'top_films' && <TopFilmsTab />}

                {activeTab === 'movies' && (
                    <div>
                        {selectedMovie ? (
                            <MovieEditor
                                movie={selectedMovie}
                                onSave={movie => { saveMovie(movie); setSelectedMovie(null); }}
                                onCancel={() => setSelectedMovie(null)}
                                onDelete={key => { deleteMovie(key); setSelectedMovie(null); }}
                            />
                        ) : (
                            <div>
                                <button onClick={handleCreateNewMovie} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md mb-4">
                                    + Add New Movie
                                </button>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {Object.values(data.movies).sort((a: Movie, b: Movie) => a.title.localeCompare(b.title)).map((movie: Movie) => (
                                        <div key={movie.key} onClick={() => setSelectedMovie(movie)} className="cursor-pointer group">
                                            <img src={movie.poster} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md border-2 border-transparent group-hover:border-red-500" />
                                            <p className="text-sm mt-1 truncate group-hover:text-red-400">{movie.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'categories' && <CategoryEditor initialCategories={data.categories} allMovies={Object.values(data.movies)} onSave={saveCategories} />}
                {activeTab === 'festival' && <FestivalEditor data={data.festivalData} config={data.festivalConfig} allMovies={data.movies} onDataChange={saveFestivalDays} onConfigChange={saveFestivalConfig} onSave={() => { /* Handled by individual change handlers */ }} />}
                {activeTab === 'submissions' && <ActorSubmissionsTab submissions={data.actorSubmissions} allMovies={data.movies} onApprove={approveActorSubmission} onReject={rejectActorSubmission} />}
                {activeTab === 'payouts' && <PayoutsTab payoutRequests={payouts} onCompletePayout={completePayout} />}
                {activeTab === 'pipeline' && <MoviePipelineTab pipeline={data.moviePipeline} onCreateMovie={handleCreateMovieFromPipeline} />}
                {activeTab === 'about' && <AboutEditor initialData={data.aboutData} onSave={saveAboutData} />}

                {activeTab === 'tools' && (
                    <div className="space-y-8">
                        <EmailSender />
                        <FallbackGenerator movies={data.movies} categories={data.categories} festivalData={data.festivalData} festivalConfig={data.festivalConfig} aboutData={data.aboutData} />
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminPage;
