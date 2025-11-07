import React, { useState, useEffect } from 'react';
import { Movie, Category, FestivalDay, FestivalConfig, AboutData, ActorSubmission, PayoutRequest, LiveData, MoviePipelineEntry } from './types';
import LoadingSpinner from './components/LoadingSpinner';
// FIX: Corrected import to use a named import for MovieEditor.
import { MovieEditor } from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import FestivalEditor from './components/FestivalEditor';
import AboutEditor from './components/AboutEditor';
import FallbackGenerator from './components/FallbackGenerator';
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import AdminPayoutsTab from './components/AdminPayoutsTab';
import SecurityTab from './components/SecurityTab';
import WatchPartyManager from './components/WatchPartyManager';
import EmailSender from './components/EmailSender';
import RokuAdminTab from './components/RokuAdminTab';
import GrowthAnalyticsTab from './components/GrowthAnalyticsTab';
import MoviePipelineTab from './components/MoviePipelineTab';
import AnalyticsPage from './components/AnalyticsPage';
import TopFilmsTab from './components/TopFilmsTab';
import ContractsTab from './components/ContractsTab';

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState<string | null>(null);

    const [liveData, setLiveData] = useState<LiveData | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState('');
    const [securityThreatLevel, setSecurityThreatLevel] = useState<'red' | 'yellow' | 'green'>('green');


    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        if (storedPassword) {
            setPassword(storedPassword);
            handleLogin(null, storedPassword);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (role) {
            // Set the default tab based on the user's role
            if (role === 'super_admin' || role === 'master') {
                setActiveTab('analytics');
            } else if (role === 'collaborator') {
                setActiveTab('movies');
            } else if (role === 'festival_admin') {
                setActiveTab('festival');
            }
        }
    }, [role]);
    
    const fetchData = async () => {
        setIsLoadingData(true);
        const adminPassword = sessionStorage.getItem('adminPassword');
        try {
            const [dataResponse, securityResponse] = await Promise.all([
                 fetch('/api/get-live-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                }),
                fetch('/api/get-security-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                }),
            ]);

            if (!dataResponse.ok) throw new Error('Failed to fetch live data.');
            const data = await dataResponse.json();
            setLiveData(data);

            if (securityResponse.ok) {
                const securityData = await securityResponse.json();
                setSecurityThreatLevel(securityData.threatLevel);
            }

        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            alert("Could not load admin data. Your session may have expired. Please try logging in again.");
        } finally {
            setIsLoadingData(false);
        }
    };
    
    const handleLogin = async (e?: React.FormEvent | null, storedPassword?: string) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError('');
        const passToTry = storedPassword || password;
        
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passToTry }),
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('adminPassword', passToTry);
                setIsAuthenticated(true);
                setRole(data.role);
            } else {
                throw new Error(data.error || 'Invalid password');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            sessionStorage.removeItem('adminPassword');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDataUpdate = async (type: 'movies' | 'categories' | 'festivalData' | 'festivalConfig' | 'aboutData', data: any) => {
        const adminPassword = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPassword, type, data }),
            });
            if (!response.ok) throw new Error('Failed to save data.');
            alert('Data saved successfully! Changes will be live momentarily.');
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Save error:", error);
            alert(`Error saving data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCreateMovieFromPipeline = (item: MoviePipelineEntry) => {
        const uniqueKey = `newmovie${Date.now()}`;
        const castArray = item.cast.split(',').map(name => ({
            name: name.trim(),
            photo: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png",
            bio: "Information regarding this actor is currently unavailable.",
            highResPhoto: "https://cratetelevision.s3.us-east-1.amazonaws.com/photos+/Defaultpic.png"
        }));

        const newMovie: Movie = {
            key: uniqueKey,
            title: item.title,
            synopsis: '',
            cast: castArray,
            director: item.director,
            trailer: '',
            fullMovie: item.movieUrl,
            poster: item.posterUrl,
        };

        const updatedMovies = { ...liveData!.movies, [uniqueKey]: newMovie };
        handleDataUpdate('movies', updatedMovies);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
                <div className="w-full max-w-sm">
                    <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV Logo" className="w-48 mx-auto mb-8"/>
                    <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
                        <h1 className="text-2xl font-bold mb-6 text-center">Admin Panel</h1>
                        <div className="relative mb-4">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="form-input w-full"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" /></svg>
                                )}
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                        <button type="submit" disabled={isLoading} className="submit-btn w-full">
                            {isLoading ? 'Verifying...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (isLoadingData || !liveData) {
        return <LoadingSpinner />;
    }
    
    const isSuperAdmin = role === 'super_admin' || role === 'master';
    const isCollaborator = role === 'collaborator';
    const isFestivalAdmin = role === 'festival_admin';

    const getTabsForRole = () => {
        if (isSuperAdmin) {
            return ['analytics', 'top-films', 'movies', 'categories', 'movie-pipeline', 'contracts', 'payouts', 'watch-party', 'festival', 'about-page', 'email', 'roku', 'fallback', 'security'];
        }
        if (isCollaborator) {
            return ['movies', 'categories', 'movie-pipeline', 'watch-party', 'email'];
        }
        if (isFestivalAdmin) {
            return ['festival'];
        }
        return [];
    };

    const availableTabs = getTabsForRole();
    // FIX: Quoted keys with hyphens to fix syntax errors.
    const tabLabels: Record<string, string> = {
        analytics: "Growth & Analytics",
        'top-films': "Top Films",
        movies: "Movie Editor",
        categories: "Category Editor",
        'movie-pipeline': "Submission Pipeline",
        contracts: "Contracts",
        payouts: "Payouts",
        'watch-party': "Watch Parties",
        festival: "Festival Editor",
        'about-page': "About Page Editor",
        email: "Email Broadcaster",
        roku: "Roku Channel",
        fallback: "Fallback Generator",
        security: "Security",
    };

    return (
        <div className="flex min-h-screen bg-gray-900 text-white">
            <nav className="w-64 bg-gray-800 p-4 flex-shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                     <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV Logo" className="w-10 h-auto"/>
                    <h2 className="text-xl font-bold">Admin</h2>
                </div>
                <ul className="space-y-1 flex-grow">
                     {availableTabs.map(tabId => (
                        <TabLink 
                            key={tabId} 
                            id={tabId} 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab} 
                            label={tabLabels[tabId]} 
                            threatLevel={tabId === 'security' ? securityThreatLevel : undefined}
                        />
                     ))}
                </ul>
            </nav>
            <main className="flex-grow p-6 md:p-8 overflow-y-auto">
                {activeTab === 'analytics' && <GrowthAnalyticsTab />}
                {activeTab === 'top-films' && <TopFilmsTab />}
                {activeTab === 'movies' && <MovieEditor allMovies={Object.values(liveData.movies)} categories={liveData.categories} onSave={(movie) => handleDataUpdate('movies', { ...liveData.movies, [movie.key]: movie })} onDelete={async (key) => { const newMovies = { ...liveData.movies }; delete newMovies[key]; await handleDataUpdate('movies', newMovies); }} />}
                {activeTab === 'categories' && <CategoryEditor initialCategories={liveData.categories} allMovies={Object.values(liveData.movies)} onSave={(cats) => handleDataUpdate('categories', cats)} />}
                {activeTab === 'movie-pipeline' && <MoviePipelineTab pipeline={liveData.moviePipeline} onCreateMovie={handleCreateMovieFromPipeline} />}
                {activeTab === 'contracts' && <ContractsTab />}
                {activeTab === 'payouts' && <AdminPayoutsTab />}
                {activeTab === 'watch-party' && <WatchPartyManager allMovies={liveData.movies} onSave={(movie) => handleDataUpdate('movies', { ...liveData.movies, [movie.key]: movie })} />}
                {activeTab === 'festival' && <FestivalEditor data={liveData.festivalData} config={liveData.festivalConfig} allMovies={liveData.movies} onDataChange={(data) => handleDataUpdate('festivalData', data)} onConfigChange={(config) => handleDataUpdate('festivalConfig', config)} onSave={() => { /* individual saves handle it */ }} />}
                {activeTab === 'about-page' && <AboutEditor initialData={liveData.aboutData} onSave={(data) => handleDataUpdate('aboutData', data)} />}
                {activeTab === 'email' && <EmailSender />}
                {activeTab === 'roku' && <RokuAdminTab />}
                {activeTab === 'fallback' && <FallbackGenerator movies={liveData.movies} categories={liveData.categories} festivalData={liveData.festivalData} festivalConfig={liveData.festivalConfig} aboutData={liveData.aboutData} />}
                {activeTab === 'security' && <SecurityTab />}
            </main>
        </div>
    );
};

const TabLink: React.FC<{ id: string, activeTab: string, setActiveTab: (id: string) => void, label: string, threatLevel?: 'red' | 'yellow' | 'green' }> = ({ id, activeTab, setActiveTab, label, threatLevel }) => (
    <li>
        <button onClick={() => setActiveTab(id)} className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors flex justify-between items-center ${activeTab === id ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
            <span>{label}</span>
            {threatLevel === 'red' && <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">CRITICAL</span>}
            {threatLevel === 'yellow' && <span className="text-xs font-bold bg-yellow-500 text-black px-2 py-0.5 rounded-full">WARNING</span>}
        </button>
    </li>
);

export default AdminPage;