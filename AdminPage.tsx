import React, { useState, useEffect, useCallback } from 'react';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import AboutEditor from './components/AboutEditor';
import FestivalEditor from './components/FestivalEditor';
import AdminPayoutsTab from './components/AdminPayoutsTab';
import SecurityTab from './components/SecurityTab';
import FallbackGenerator from './components/FallbackGenerator';
import EmailSender from './components/EmailSender';
import RokuAdminTab from './components/RokuAdminTab';
import AnalyticsPage from './components/AnalyticsPage';
import TopFilmsTab from './components/TopFilmsTab';
import MoviePipelineTab from './components/MoviePipelineTab';
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import GrowthAnalyticsTab from './components/GrowthAnalyticsTab';
import WatchPartyManager from './components/WatchPartyManager';
import { listenToAllAdminData, saveMovie, deleteMovie, saveCategories, saveFestivalConfig, saveFestivalDays, saveAboutData, approveActorSubmission, rejectActorSubmission } from './services/firebaseService';
import { LiveData, Movie, MoviePipelineEntry } from './types';
import { invalidateCache } from './services/dataService';

type AdminRole = 'super_admin' | 'master' | 'collaborator' | 'festival_admin' | 'none';
type AdminTab = 'movies' | 'categories' | 'festival' | 'about' | 'payouts' | 'security' | 'fallback' | 'email' | 'roku' | 'analytics' | 'top-films' | 'pipeline' | 'actor-submissions' | 'growth' | 'watch-party';
type SecurityStatus = 'green' | 'yellow' | 'red' | 'loading' | 'error';

const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<AdminRole>('none');
    const [error, setError] = useState('');
    const [data, setData] = useState<LiveData | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTab>('movies');
    const [isPublishing, setIsPublishing] = useState(false);
    const [securityStatus, setSecurityStatus] = useState<SecurityStatus>('loading');

    useEffect(() => {
        const savedPass = sessionStorage.getItem('adminPassword');
        const savedRole = sessionStorage.getItem('adminRole') as AdminRole;
        if (savedPass && savedRole) {
            setPassword(savedPass);
            setRole(savedRole);
        }
    }, []);
    
    useEffect(() => {
        if (role === 'none') return;
        
        // Fetch security status as soon as admin logs in
        const fetchSecurityStatus = async () => {
            const adminPassword = sessionStorage.getItem('adminPassword');
            if (!adminPassword) {
                setSecurityStatus('error');
                return;
            }
             try {
                const response = await fetch('/api/get-security-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                });
                if (!response.ok) throw new Error('Failed to fetch security status.');
                const report = await response.json();
                setSecurityStatus(report.threatLevel);
            } catch {
                setSecurityStatus('error'); // If API fails, show an error state or default
            }
        };

        fetchSecurityStatus();
        
        let unsubscribe: (() => void) | null = null;
        
        const setupListener = async () => {
            unsubscribe = await listenToAllAdminData(result => {
                if (result.data) {
                    setData(result.data);
                }
            });
        };
        
        setupListener();
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [role]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('adminPassword', password);
                sessionStorage.setItem('adminRole', data.role);
                setRole(data.role);
            } else {
                setError('Invalid password');
            }
        } catch {
            setError('Login failed. Please try again.');
        }
    };
    
    const handleLogout = () => {
        sessionStorage.removeItem('adminPassword');
        sessionStorage.removeItem('adminRole');
        setRole('none');
        setPassword('');
    };
    
    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: sessionStorage.getItem('adminPassword') }),
            });
            if (!response.ok) throw new Error('Failed to publish.');
            invalidateCache(); // Invalidate local browser cache
            alert('Live data published successfully!');
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsPublishing(false);
        }
    };
    
    const onCreateMovieFromPipeline = (item: MoviePipelineEntry) => {
        const uniqueKey = `newmovie${Date.now()}`;
        const newMovie: Movie = {
            key: uniqueKey,
            title: item.title,
            synopsis: '',
            cast: item.cast.split(',').map(name => ({ name: name.trim(), photo: '', bio: '', highResPhoto: '' })),
            director: item.director,
            poster: item.posterUrl,
            fullMovie: item.movieUrl,
            trailer: '',
        };
        setData(d => d ? ({ ...d, movies: { ...d.movies, [uniqueKey]: newMovie } }) : d);
        setActiveTab('movies');
    };
    
    if (role === 'none') { /* Login Form */ }

    if (!data) { /* Loading Spinner */ }

    const tabs: { id: AdminTab; label: string; roles: AdminRole[] }[] = [
        { id: 'movies', label: 'Movie Editor', roles: ['super_admin', 'master', 'collaborator'] },
        { id: 'categories', label: 'Category Editor', roles: ['super_admin', 'master', 'collaborator'] },
        { id: 'pipeline', label: 'Submission Pipeline', roles: ['super_admin', 'master', 'collaborator'] },
        { id: 'actor-submissions', label: 'Actor Submissions', roles: ['super_admin', 'master'] },
        { id: 'watch-party', label: 'Watch Party Manager', roles: ['super_admin', 'master'] },
        { id: 'festival', label: 'Festival Editor', roles: ['super_admin', 'master', 'festival_admin'] },
        { id: 'about', label: 'About Page', roles: ['super_admin', 'master'] },
        { id: 'analytics', label: 'Platform Analytics', roles: ['super_admin', 'master'] },
        { id: 'growth', label: 'Growth Analytics', roles: ['super_admin', 'master'] },
        { id: 'top-films', label: 'Top Films', roles: ['super_admin', 'master', 'collaborator'] },
        { id: 'payouts', label: 'Payouts', roles: ['super_admin', 'master'] },
        { id: 'email', label: 'Email Sender', roles: ['super_admin', 'master'] },
        { id: 'security', label: 'Security', roles: ['super_admin', 'master'] },
        { id: 'roku', label: 'Roku', roles: ['super_admin', 'master'] },
        { id: 'fallback', label: 'Fallback Data', roles: ['super_admin', 'master'] },
    ];
    
    const availableTabs = tabs.filter(tab => tab.roles.includes(role));
    
    return (
        <div className="bg-gray-900 min-h-screen text-white p-4 sm:p-6 md:p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                 {role !== 'none' && <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>}
            </div>

             {/* Login */}
            {role === 'none' && (
                <form onSubmit={handleLogin} className="max-w-sm mx-auto bg-gray-800 p-8 rounded-lg">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" className="form-input" />
                    <button type="submit" className="submit-btn w-full mt-4">Login</button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            )}

            {/* Main Content */}
            {role !== 'none' && (
                <>
                {data ? (
                    <>
                        <div className="flex justify-end mb-4">
                            <button onClick={handlePublish} disabled={isPublishing} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-md">
                                {isPublishing ? 'Publishing...' : 'Publish Live Data'}
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                           {availableTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                >
                                    {tab.label}
                                    {tab.id === 'security' && securityStatus === 'red' && (
                                        <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full ring-2 ring-white/80">CRITICAL</span>
                                    )}
                                     {tab.id === 'security' && securityStatus === 'yellow' && (
                                        <span className="px-2 py-0.5 text-xs font-bold text-black bg-yellow-400 rounded-full">WARNING</span>
                                    )}
                                </button>
                           ))}
                        </div>

                        {/* Render Active Tab Content */}
                        {activeTab === 'movies' && <MovieEditor allMovies={Object.values(data.movies)} categories={data.categories} onSave={saveMovie} onDelete={deleteMovie} />}
                        {activeTab === 'categories' && <CategoryEditor initialCategories={data.categories} allMovies={Object.values(data.movies)} onSave={saveCategories} />}
                        {activeTab === 'festival' && <FestivalEditor data={data.festivalData} config={data.festivalConfig} allMovies={data.movies} onDataChange={(d) => setData(s => s ? ({...s, festivalData: d}) : null)} onConfigChange={(c) => setData(s => s ? ({...s, festivalConfig: c}) : null)} onSave={() => { saveFestivalConfig(data.festivalConfig); saveFestivalDays(data.festivalData); }} />}
                        {activeTab === 'about' && <AboutEditor initialData={data.aboutData} onSave={saveAboutData} />}
                        {activeTab === 'payouts' && <AdminPayoutsTab />}
                        {activeTab === 'security' && <SecurityTab />}
                        {activeTab === 'fallback' && <FallbackGenerator movies={data.movies} categories={data.categories} festivalData={data.festivalData} festivalConfig={data.festivalConfig} aboutData={data.aboutData} />}
                        {activeTab === 'email' && <EmailSender />}
                        {activeTab === 'roku' && <RokuAdminTab />}
                        {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                        {activeTab === 'top-films' && <TopFilmsTab />}
                        {activeTab === 'pipeline' && <MoviePipelineTab pipeline={data.moviePipeline} onCreateMovie={onCreateMovieFromPipeline} />}
                        {activeTab === 'actor-submissions' && <ActorSubmissionsTab submissions={data.actorSubmissions} allMovies={data.movies} onApprove={approveActorSubmission} onReject={rejectActorSubmission} />}
                        {activeTab === 'growth' && <GrowthAnalyticsTab />}
                        {activeTab === 'watch-party' && <WatchPartyManager allMovies={data.movies} onSave={saveMovie} />}
                    </>
                ) : (
                    <div>Loading admin data...</div>
                )}
                </>
            )}
        </div>
    );
};

export default AdminPage;