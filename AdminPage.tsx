
import React, { useState, useEffect, useMemo } from 'react';
import { Movie, Category, FestivalConfig, FestivalDay, AboutData, ActorSubmission, LiveData, PayoutRequest, MoviePipelineEntry } from './types';
import { listenToAllAdminData, approveActorSubmission, rejectActorSubmission, deleteMoviePipelineEntry } from './services/firebaseService';

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
import MoviePipelineTab from './components/MoviePipelineTab';

type PublishStatus = 'idle' | 'saving' | 'success' | 'error';
type AdminRole = 'super_admin' | 'festival_admin' | 'collaborator' | null;

const AdminPage: React.FC = () => {
    // --- Auth State ---
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [adminRole, setAdminRole] = useState<AdminRole>(null);
    const [showPassword, setShowPassword] = useState(false);

    // --- Core State ---
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [draftData, setDraftData] = useState<LiveData | null>(null);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
    const [publishError, setPublishError] = useState('');

    // --- Roku Download State ---
    const [rokuDownloadStatus, setRokuDownloadStatus] = useState<'idle' | 'generating' | 'error'>('idle');
    const [rokuDownloadError, setRokuDownloadError] = useState('');

    // --- Editor-specific State ---
    const [selectedMovieKey, setSelectedMovieKey] = useState<string | null>(null);

    // Check session for authentication
    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        const storedRole = sessionStorage.getItem('adminRole') as AdminRole;
        if (storedPassword && storedRole) {
            setPassword(storedPassword);
            setAdminRole(storedRole);
            setIsAuthenticated(true);
            if (storedRole === 'festival_admin') {
                setActiveTab('festival'); // Default festival admins to the festival tab
            } else if (storedRole === 'collaborator') {
                setActiveTab('pipeline'); // Default collaborators to the pipeline tab
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    // Fetch all data after authentication
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            setIsLoading(true);

            // Fetch Payouts (only for super admins)
            if (adminRole === 'super_admin') {
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
    }, [isAuthenticated, password, adminRole]);


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
                const { role } = await res.json();
                sessionStorage.setItem('adminPassword', password);
                sessionStorage.setItem('adminRole', role || 'super_admin');
                setAdminRole(role || 'super_admin');
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
    
    const handleAddNewMovie = () => {
        const newKey = `newmovie${Date.now()}`;
        const newMovie: Movie = { 
            key: newKey, 
            title: 'New Film', 
            synopsis: '', 
            cast: [], 
            director: '', 
            trailer: '', 
            fullMovie: '', 
            poster: '', 
            likes: 0 
        };
        setDraftData(prev => prev ? ({ ...prev, movies: { ...prev.movies, [newKey]: newMovie } }) : null);
        setSelectedMovieKey(newKey);
    };

    const handleCreateMovieFromPipeline = (item: MoviePipelineEntry) => {
        const newMovie: Partial<Movie> = {
            key: `newmovie${Date.now()}`,
            title: item.title,
            poster: item.posterUrl,
            fullMovie: item.movieUrl,
            director: item.director,
            cast: item.cast.split(',').map(name => ({ name: name.trim(), photo: '', bio: '', highResPhoto: '' })),
            synopsis: '',
            trailer: '',
            likes: 0,
        };
        setDraftData(prev => prev ? ({ ...prev, movies: { ...prev.movies, [newMovie.key as string]: newMovie as Movie } }) : null);
        setSelectedMovieKey(newMovie.key as string);
        setActiveTab('movies');
        // Delete the entry from the pipeline after creating the draft
        deleteMoviePipelineEntry(item.id);
    };

    const selectedMovie = useMemo(() => {
        if (!selectedMovieKey || !draftData) return null;
        return draftData.movies[selectedMovieKey];
    }, [selectedMovieKey, draftData]);

    const handleRokuDownload = async () => {
        setRokuDownloadStatus('generating');
        setRokuDownloadError('');
    
        const adminPassword = sessionStorage.getItem('adminPassword');
        if (!adminPassword) {
            setRokuDownloadError('Authentication error. Please log in again.');
            setRokuDownloadStatus('error');
            return;
        }
    
        try {
            const response = await fetch(`/api/generate-roku-zip?password=${encodeURIComponent(adminPassword)}`);
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate package: ${errorText} (Status: ${response.status})`);
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cratetv.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setRokuDownloadStatus('idle');
    
        } catch (err) {
            setRokuDownloadError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setRokuDownloadStatus('error');
        }
    };
    
    const isSuperAdmin = adminRole === 'super_admin';
    const isFestivalAdmin = adminRole === 'festival_admin';
    const isCollaborator = adminRole === 'collaborator';

    // --- RENDER LOGIC ---
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#141414] text-white">
                <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-center mb-6">Admin Login</h2>
                    <form onSubmit={handleLogin}>
                         <div className="relative mb-4">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white"
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
                <h1 className="text-3xl font-bold">Admin Dashboard {adminRole !== 'super_admin' && <span className="text-lg font-normal text-purple-400">({adminRole?.replace('_', ' ')})</span>}</h1>
                <div className="flex items-center gap-4">
                    {publishStatus === 'error' && <span className="text-red-400 text-sm">{publishError}</span>}
                    <button onClick={handlePublish} disabled={publishStatus === 'saving'} className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold py-2 px-6 rounded-md transition">
                        {publishStatus === 'saving' ? 'Publishing...' : publishStatus === 'success' ? 'Published!' : 'Publish Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-gray-700">
                {isSuperAdmin && <TabButton tabId="dashboard" label="Dashboard" />}
                {isFestivalAdmin && <TabButton tabId="festival-dashboard" label="Festival Dashboard" />}
                {(isSuperAdmin || isFestivalAdmin || isCollaborator) && <TabButton tabId="movies" label="Movies" />}
                {(isSuperAdmin || isFestivalAdmin || isCollaborator) && <TabButton tabId="pipeline" label="Movie Pipeline" />}
                {(isSuperAdmin || isFestivalAdmin) && <TabButton tabId="festival" label="Festival" />}
                {isSuperAdmin && (
                    <>
                        <TabButton tabId="categories" label="Categories" />
                        <TabButton tabId="about" label="About Us" />
                        <TabButton tabId="top-films" label="Top Films" />
                        <TabButton tabId="submissions" label="Actor Submissions" />
                        <TabButton tabId="payouts" label="Payouts" />
                        <TabButton tabId="email" label="Email Users" />
                        <TabButton tabId="tools" label="Tools" />
                    </>
                )}
            </div>

            <div className="mt-6 bg-gray-800 p-6 rounded-b-lg">
                {activeTab === 'dashboard' && isSuperAdmin && <AnalyticsPage viewMode="full" />}
                {activeTab === 'festival-dashboard' && isFestivalAdmin && <AnalyticsPage viewMode="festival" />}

                {activeTab === 'movies' && (
                    selectedMovie ? (
                        <MovieEditor movie={selectedMovie} onSave={handleSaveMovie} onCancel={() => setSelectedMovieKey(null)} onDelete={handleDeleteMovie} />
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-red-400">All Films</h2>
                                <button onClick={handleAddNewMovie} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm">+ Add New Movie</button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                
                {activeTab === 'pipeline' && (isSuperAdmin || isFestivalAdmin || isCollaborator) && <MoviePipelineTab pipeline={draftData.moviePipeline} onCreateMovie={handleCreateMovieFromPipeline} />}
                {activeTab === 'categories' && isSuperAdmin && <CategoryEditor initialCategories={draftData.categories} allMovies={Object.values(draftData.movies) as Movie[]} onSave={handleSaveCategories} />}
                {activeTab === 'festival' && (isSuperAdmin || isFestivalAdmin) && <FestivalEditor data={draftData.festivalData} config={draftData.festivalConfig} allMovies={draftData.movies} onDataChange={(d) => setDraftData(p => p ? {...p, festivalData: d} : null)} onConfigChange={(c) => setDraftData(p => p ? {...p, festivalConfig: c} : null)} onSave={() => {}} />}
                {activeTab === 'about' && isSuperAdmin && <AboutEditor initialData={draftData.aboutData} onSave={(d) => setDraftData(p => p ? {...p, aboutData: d} : null)} />}
                {activeTab === 'top-films' && isSuperAdmin && <TopFilmsTab />}
                {activeTab === 'submissions' && isSuperAdmin && <ActorSubmissionsTab submissions={draftData.actorSubmissions} allMovies={draftData.movies} onApprove={approveActorSubmission} onReject={rejectActorSubmission} />}
                {activeTab === 'payouts' && isSuperAdmin && <PayoutsTab payoutRequests={payoutRequests} onCompletePayout={handleCompletePayout} />}
                {activeTab === 'email' && isSuperAdmin && <EmailSender />}
                {activeTab === 'tools' && isSuperAdmin && (
                    <div className="space-y-8">
                        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                             <h2 className="text-2xl font-bold text-green-400 mb-4">Roku Channel Packager</h2>
                             <p className="text-gray-300 mb-4">Generate a ready-to-upload ZIP file for the Roku channel. This package will use the currently published live data.</p>
                             <button onClick={handleRokuDownload} disabled={rokuDownloadStatus === 'generating'} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-6 rounded-md">
                                {rokuDownloadStatus === 'generating' ? 'Generating...' : 'Generate & Download Roku ZIP'}
                             </button>
                             {rokuDownloadStatus === 'error' && <p className="text-red-400 text-sm mt-2">{rokuDownloadError}</p>}
                        </div>
                        <FallbackGenerator movies={draftData.movies} categories={draftData.categories} festivalData={draftData.festivalData} festivalConfig={draftData.festivalConfig} aboutData={draftData.aboutData} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
