import React, { useState, useEffect } from 'react';
import { listenToAllAdminData, saveMovie, deleteMovie, saveCategories, saveFestivalConfig, saveFestivalDays, saveAboutData } from './services/firebaseService';
import { LiveData, Movie, Category, FestivalConfig, FestivalDay, AboutData } from './types';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import FestivalEditor from './components/FestivalEditor';
import AboutEditor from './components/AboutEditor';
import FallbackGenerator from './components/FallbackGenerator';
import LoadingSpinner from './components/LoadingSpinner';
import AnalyticsPage from './components/AnalyticsPage';
import ActorSubmissionsTab from './components/ActorSubmissionsTab';
import MoviePipelineTab from './components/MoviePipelineTab';
import AdminPayoutsTab from './components/AdminPayoutsTab';
import TopFilmsTab from './components/TopFilmsTab';
import EmailSender from './components/EmailSender';
import RokuAdminTab from './components/RokuAdminTab';
import WatchPartyAdminTab from './components/WatchPartyAdminTab';

type AdminRole = 'super_admin' | 'festival_admin' | 'collaborator' | null;

const LoginPage: React.FC<{ onLogin: (password: string, role: AdminRole) => void; onFirstLogin: () => void; }> = ({ onLogin, onFirstLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            if (data.firstLogin) {
                onFirstLogin();
            }
            onLogin(password, data.role);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="w-full max-w-sm">
                <form onSubmit={handleLogin} className="bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                    <h1 className="text-2xl font-bold text-center mb-6">Admin Panel</h1>
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="form-input w-full"
                            id="password"
                            type="password"
                            placeholder="******************"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminPage: React.FC = () => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [adminRole, setAdminRole] = useState<AdminRole>(null);
    const [isFirstLogin, setIsFirstLogin] = useState(false);
    const [data, setData] = useState<LiveData | null>(null);
    const [source, setSource] = useState<'firebase' | 'fallback' | null>(null);
    const [error, setError] = useState<string | undefined>();
    const [activeTab, setActiveTab] = useState('analytics');
    
    useEffect(() => {
        const password = sessionStorage.getItem('adminPassword');
        const role = sessionStorage.getItem('adminRole') as AdminRole;
        if (password && role) {
            setLoggedIn(true);
            setAdminRole(role);
        }
    }, []);

    useEffect(() => {
        if (!loggedIn) return;
        
        let unsubscribe: (() => void) | null = null;
        
        const setupListener = async () => {
            unsubscribe = await listenToAllAdminData((result) => {
                setData(result.data);
                setSource(result.source);
                setError(result.error);
            });
        };
        
        setupListener();
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [loggedIn]);

    const handleLogin = (password: string, role: AdminRole) => {
        sessionStorage.setItem('adminPassword', password);
        sessionStorage.setItem('adminRole', role || '');
        setLoggedIn(true);
        setAdminRole(role);
        // Default to the first available tab for the role
        setActiveTab(getAvailableTabs(role)[0] || 'analytics');
    };

    const handleFirstLogin = () => {
        setIsFirstLogin(true);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('adminPassword');
        sessionStorage.removeItem('adminRole');
        setLoggedIn(false);
        setAdminRole(null);
    };

    const handleSaveAll = async () => {
        if (!data) return;
        if (source === 'fallback') {
            alert("Running in local mode. Changes are not saved to the server.");
            return;
        }
        try {
            await Promise.all([
                saveCategories(data.categories),
                saveFestivalConfig(data.festivalConfig),
                saveFestivalDays(data.festivalData),
                saveAboutData(data.aboutData)
            ]);
            alert('All data saved successfully!');
        } catch (error) {
            alert('An error occurred while saving: ' + (error as Error).message);
        }
    };
    
    if (!loggedIn) {
        return <LoginPage onLogin={handleLogin} onFirstLogin={handleFirstLogin} />;
    }

    if (!data) {
        return <LoadingSpinner />;
    }
    
    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabId ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    const getAvailableTabs = (role: AdminRole): string[] => {
        switch (role) {
            case 'super_admin':
                return ['analytics', 'movies', 'categories', 'festival', 'about', 'pipeline', 'payouts', 'top-films', 'emails', 'watch-party', 'roku', 'fallback'];
            case 'festival_admin':
                return ['festival', 'analytics-festival'];
            case 'collaborator':
                return ['movies', 'categories', 'pipeline'];
            default:
                return [];
        }
    };

    const availableTabs = getAvailableTabs(adminRole);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Admin Panel</h1>
                    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Sign Out</button>
                </div>

                {isFirstLogin && (
                    <div className="p-4 mb-4 text-yellow-800 bg-yellow-200 border border-yellow-300 rounded-md">
                        <strong>First-time setup!</strong> No admin password is set. Please set the ADMIN_PASSWORD environment variable to secure this panel.
                    </div>
                )}
                {error && <div className="p-4 mb-4 text-red-800 bg-red-200 border border-red-300 rounded-md"><strong>Error:</strong> {error}</div>}
                
                <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                    {availableTabs.includes('analytics') && <TabButton tabId="analytics" label="Analytics" />}
                    {availableTabs.includes('movies') && <TabButton tabId="movies" label="Movies" />}
                    {availableTabs.includes('categories') && <TabButton tabId="categories" label="Categories" />}
                    {availableTabs.includes('festival') && <TabButton tabId="festival" label="Festival" />}
                    {availableTabs.includes('about') && <TabButton tabId="about" label="About Page" />}
                    {availableTabs.includes('pipeline') && <TabButton tabId="pipeline" label="Pipeline" />}
                    {availableTabs.includes('payouts') && <TabButton tabId="payouts" label="Payouts" />}
                    {availableTabs.includes('top-films') && <TabButton tabId="top-films" label="Top Films" />}
                    {availableTabs.includes('emails') && <TabButton tabId="emails" label="Emails" />}
                    {availableTabs.includes('watch-party') && <TabButton tabId="watch-party" label="Watch Parties" />}
                    {availableTabs.includes('roku') && <TabButton tabId="roku" label="Roku" />}
                    {availableTabs.includes('fallback') && <TabButton tabId="fallback" label="Fallback" />}
                    {availableTabs.includes('analytics-festival') && <TabButton tabId="analytics-festival" label="Festival Analytics" />}
                </div>

                <div className="mt-6">
                    {activeTab === 'movies' && <MovieEditor allMovies={Object.values(data.movies)} categories={data.categories} onSave={saveMovie} onDelete={deleteMovie} />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={data.categories} allMovies={Object.values(data.movies)} onSave={saveCategories} />}
                    {activeTab === 'festival' && <FestivalEditor data={data.festivalData} config={data.festivalConfig} allMovies={data.movies} onDataChange={(newData) => setData(d => d ? ({ ...d, festivalData: newData }) : null)} onConfigChange={(newConfig) => setData(d => d ? ({ ...d, festivalConfig: newConfig }) : null)} onSave={() => { if (data.festivalConfig) saveFestivalConfig(data.festivalConfig); saveFestivalDays(data.festivalData); }} />}
                    {activeTab === 'about' && data.aboutData && <AboutEditor initialData={data.aboutData} onSave={saveAboutData} />}
                    {activeTab === 'fallback' && <FallbackGenerator movies={data.movies} categories={data.categories} festivalData={data.festivalData} festivalConfig={data.festivalConfig} aboutData={data.aboutData} />}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'analytics-festival' && <AnalyticsPage viewMode="festival" />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={data.moviePipeline} onCreateMovie={(item) => {/* Logic to open MovieEditor with pre-filled data */}} />}
                    {activeTab === 'payouts' && <AdminPayoutsTab />}
                    {activeTab === 'top-films' && <TopFilmsTab />}
                    {activeTab === 'emails' && <EmailSender />}
                    {activeTab === 'watch-party' && <WatchPartyAdminTab allMovies={data.movies} />}
                    {activeTab === 'roku' && <RokuAdminTab />}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;