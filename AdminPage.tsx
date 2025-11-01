import React, { useState, useEffect, useMemo } from 'react';
import { Movie, Category, FestivalConfig, FestivalDay, AboutData, ActorSubmission, LiveData, PayoutRequest } from './types';
import { listenToAllAdminData, approveActorSubmission, rejectActorSubmission } from './services/firebaseService';

import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import FestivalEditor from './components/FestivalEditor';
import AboutEditor from './components/AboutEditor';
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import FallbackGenerator from './components/FallbackGenerator';
import AnalyticsPage from './components/AnalyticsPage';
import PayoutsTab from './components/PayoutsTab';
import EmailSender from './components/EmailSender';
import TopFilmsTab from './components/TopFilmsTab';

type PublishStatus = 'idle' | 'saving' | 'success' | 'error';

const AdminPage: React.FC = () => {
    // --- Auth State ---
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');

    // --- Core State ---
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [draftData, setDraftData] = useState<LiveData | null>(null);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
    const [publishError, setPublishError] = useState('');

    // --- Editor-specific State ---
    const [selectedMovieKey, setSelectedMovieKey] = useState<string | null>(null);

    // Check session for authentication
    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        if (storedPassword) {
            setPassword(storedPassword);
            setIsAuthenticated(true);
        } else {
            setIsLoading(false);
        }
    }, []);

    // Fetch all data after authentication
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            setIsLoading(true);

            // Fetch Payouts
            try {
                const res = await fetch('/api/get-payouts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });
                if (res.ok) {
                    const { payoutRequests } = await res.json();
                    setPayoutRequests(payoutRequests);
                }
            } catch (err) {
                console.error("Failed to fetch payout requests:", err);
            }
            
            // This returns an unsubscribe function
            const unsubscribePromise = listenToAllAdminData((result) => {
                if (result.data) {
                    setDraftData(result.data);
                }
                if (result.error) {
                    console.error("Data loading error:", result.error);
                }
                setIsLoading(false);
            });

            return () => {
                unsubscribePromise.then(unsub => unsub());
            };
        };

        fetchData();
    }, [isAuthenticated, password]);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        try {
            const res = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                sessionStorage.setItem('adminPassword', password);
                setIsAuthenticated(true);
            } else {
                setAuthError('Incorrect password.');
            }
        } catch (err) {
            setAuthError('Login request failed.');
        }
    };
    
    // --- SAVE HANDLERS (update local draft state) ---
    const handleSaveMovie = (movieToSave: Movie) => {
        setDraftData(prev => prev ? ({ ...prev, movies: { ...prev.movies, [movieToSave.key]: movieToSave } }) : null);
        setSelectedMovieKey(null);
    };

    const handleDeleteMovie = (movieKey: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this movie?")) return;
        setDraftData(prev => {
            if (!prev) return null;
            const newMovies = { ...prev.movies };
            delete newMovies[movieKey];
            const newCategories = JSON.parse(JSON.stringify(prev.categories));
            Object.keys(newCategories).forEach(catKey => {
                newCategories[catKey].movieKeys = newCategories[catKey].movieKeys.filter((key: string) => key !== movieKey);
            });
            return { ...prev, movies: newMovies, categories: newCategories };
        });
        setSelectedMovieKey(null);
    };

    const handleSaveCategories = (newCategories: Record<string, Category>) => {
        setDraftData(prev => prev ? ({ ...prev, categories: newCategories }) : null);
    };
    
    // --- PUBLISH TO LIVE ---
    const handlePublish = async () => {
        if (!draftData) return;
        setPublishStatus('saving');
        setPublishError('');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: draftData, password }),
            });
            if (!response.ok) throw new Error((await response.json()).error || "Failed to publish.");
            
            // Broadcast the update to all open client tabs
            const channel = new BroadcastChannel('cratetv-data-channel');
            channel.postMessage({ type: 'DATA_PUBLISHED', payload: draftData });
            channel.close();

            setPublishStatus('success');
            setTimeout(() => setPublishStatus('idle'), 3000);
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : "An unknown error occurred.");
            setPublishStatus('error');
        }
    };

    // --- PAYOUT HANDLER ---
    const handleCompletePayout = async (requestId: string) => {
        await fetch('/api/complete-payout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, password }),
        });
        setPayoutRequests(prev => prev.map(p => p.id === requestId ? { ...p, status: 'completed' } : p));
    };

    const selectedMovie = useMemo(() => {
        if (!selectedMovieKey || !draftData) return null;
        return draftData.movies[selectedMovieKey];
    }, [selectedMovieKey, draftData]);

    const handleRokuDownload = () => {
        const downloadUrl = `/api/generate-roku-zip?t=${Date.now()}`;
        window.open(downloadUrl, '_blank');
    };

    // --- RENDER LOGIC ---
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#141414] text-white">
                <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-6">Admin Login</h2>
                    <form onSubmit={handleLogin}>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-3 mb-4 bg-gray-700 border border-gray-600 rounded-md text-white" />
                        <button type="submit" className="w-full p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md">Login</button>
                        {authError && <p className="text-red-500 text-center mt-4">{authError}</p>}
                    </form>
                </div>
            </div>
        );
    }

    if (isLoading || !draftData) {
        return <LoadingSpinner />;
    }
    
    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button onClick={() => { setActiveTab(tabId); setSelectedMovieKey(null); }} className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>{label}</button>
    );

    return (
        <div className="p-4 md:p-8 bg-[#141414] text-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    {publishStatus === 'error' && <span className="text-red-400 text-sm">{publishError}</span>}
                    <button onClick={handlePublish} disabled={publishStatus === 'saving'} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-6 rounded-md transition">
                        {publishStatus === 'saving' ? 'Publishing...' : publishStatus === 'success' ? 'Published!' : 'Publish Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-gray-700">
                <TabButton tabId="dashboard" label="Dashboard" />
                <TabButton tabId="movies" label="Movies" />
                <TabButton tabId="categories" label="Categories" />
                <TabButton tabId="festival" label="Festival" />
                <TabButton tabId="about" label="About Us" />
                <TabButton tabId="top-films" label="Top Films" />
                <TabButton tabId="submissions" label="Actor Submissions" />
                <TabButton tabId="payouts" label="Payouts" />
                <TabButton tabId="email" label="Email Users" />
                <TabButton tabId="tools" label="Tools" />
            </div>

            <div className="mt-6 bg-gray-800 p-6 rounded-b-lg">
                {activeTab === 'dashboard' && <AnalyticsPage />}

                {activeTab === 'movies' && (
                    selectedMovie ? (
                        <MovieEditor movie={selectedMovie} onSave={handleSaveMovie} onCancel={() => setSelectedMovieKey(null)} onDelete={handleDeleteMovie} />
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-red-400">All Films</h2>
                                <button onClick={() => setSelectedMovieKey(`newmovie${Date.now()}`)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">+ Add New Movie</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {/* FIX: Explicitly cast `Object.values` to `Movie[]` to resolve TypeScript inference errors. */}
                                {(Object.values(draftData.movies) as Movie[]).sort((a,b) => a.title.localeCompare(b.title)).map(movie => (
                                    <div key={movie.key} onClick={() => setSelectedMovieKey(movie.key)} className="cursor-pointer group">
                                        <img src={movie.poster} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md border-2 border-transparent group-hover:border-red-500" />
                                        <p className="text-sm mt-2 text-center truncate">{movie.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {/* FIX: Explicitly cast `Object.values` to `Movie[]` for the `allMovies` prop to match the expected type. */}
                {activeTab === 'categories' && <CategoryEditor initialCategories={draftData.categories} allMovies={Object.values(draftData.movies) as Movie[]} onSave={handleSaveCategories} />}
                {activeTab === 'festival' && <FestivalEditor data={draftData.festivalData} config={draftData.festivalConfig} allMovies={draftData.movies} onDataChange={(d) => setDraftData(p => p ? {...p, festivalData: d} : null)} onConfigChange={(c) => setDraftData(p => p ? {...p, festivalConfig: c} : null)} onSave={() => {}} />}
                {activeTab === 'about' && <AboutEditor initialData={draftData.aboutData} onSave={(d) => setDraftData(p => p ? {...p, aboutData: d} : null)} />}
                {activeTab === 'top-films' && <TopFilmsTab />}
                {activeTab === 'submissions' && <ActorSubmissionsTab submissions={draftData.actorSubmissions} allMovies={draftData.movies} onApprove={approveActorSubmission} onReject={rejectActorSubmission} />}
                {activeTab === 'payouts' && <PayoutsTab payoutRequests={payoutRequests} onCompletePayout={handleCompletePayout} />}
                {activeTab === 'email' && <EmailSender />}

                {activeTab === 'tools' && (
                    <div className="space-y-8">
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                             <h2 className="text-2xl font-bold text-green-400 mb-4">Roku Channel Packager</h2>
                             <p className="text-gray-300 mb-4">Generate a ready-to-upload ZIP file for the Roku channel. This package will use the currently published live data.</p>
                             <button onClick={handleRokuDownload} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md">Generate & Download Roku ZIP</button>
                        </div>
                        <FallbackGenerator movies={draftData.movies} categories={draftData.categories} festivalData={draftData.festivalData} festivalConfig={draftData.festivalConfig} aboutData={draftData.aboutData} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;