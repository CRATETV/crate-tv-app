import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, PayoutRequest } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import AboutEditor from './components/AboutEditor';
import FestivalEditor from './components/FestivalEditor';
import AnalyticsPage from './components/AnalyticsPage';
import WatchPartyManager from './components/WatchPartyManager';
import SecurityTab from './components/SecurityTab';
import RokuAdminTab from './components/RokuAdminTab';
import FallbackGenerator from './components/FallbackGenerator';
import EmailSender from './components/EmailSender';
import ContractsTab from './components/ContractsTab';
import AdminPayoutsTab from './components/AdminPayoutsTab';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import PermissionsManager from './components/PermissionsManager';
import SaveStatusToast from './components/SaveStatusToast';
import MonetizationTab from './components/MonetizationTab';

const ALL_TABS: Record<string, string> = {
    analytics: 'Analytics',
    movies: 'Movies',
    pipeline: 'Pipeline',
    payouts: 'Payouts',
    categories: 'Categories',
    festival: 'Festival',
    watchParty: 'Watch Party',
    about: 'About Page',
    email: 'Email',
    contracts: 'File Cabinet',
    monetization: 'Monetization',
    security: 'Security',
    roku: 'Roku',
    fallback: 'Fallback Data',
    permissions: 'Permissions'
};


const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    // Data states
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('analytics');

    // Save states
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        const savedPassword = sessionStorage.getItem('adminPassword');
        if (savedPassword) {
            setPassword(savedPassword);
            handleLogin(null, savedPassword);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchAllData = useCallback(async (adminPassword: string) => {
        setIsLoading(true);
        setError('');
        const errors: string[] = [];
    
        try {
            const results = await Promise.allSettled([
                fetch('/api/get-live-data?noCache=true'),
                fetch('/api/get-pipeline-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-admin-permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) })
            ]);
    
            // Process live data
            const dataResResult = results[0];
            if (dataResResult.status === 'fulfilled' && dataResResult.value.ok) {
                const data = await dataResResult.value.json();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                setAboutData(data.aboutData || null);
                setFestivalData(data.festivalData || []);
                setFestivalConfig(data.festivalConfig || null);
            } else {
                errors.push('Failed to fetch live site data.');
            }
    
            // Process pipeline data
            const pipelineResResult = results[1];
            if (pipelineResResult.status === 'fulfilled' && pipelineResResult.value.ok) {
                const pipelineData = await pipelineResResult.value.json();
                setPipeline(pipelineData.pipeline || []);
            } else {
                errors.push('Failed to fetch submission pipeline.');
            }
    
            // Process payouts
            const payoutsResResult = results[2];
            if (payoutsResResult.status === 'fulfilled' && payoutsResResult.value.ok) {
                const payoutsData = await payoutsResResult.value.json();
                setPayoutRequests(payoutsData.payoutRequests || []);
            } else {
                errors.push('Failed to fetch payout requests.');
            }

            // Process permissions
            const permsResResult = results[3];
            if (permsResResult.status === 'fulfilled' && permsResResult.value.ok) {
                const permsData = await permsResResult.value.json();
                setPermissions(permsData.permissions || {});
            } else {
                errors.push('Failed to fetch user role permissions.');
            }
    
            if (errors.length > 0) {
                setError(`Could not load some data: ${errors.join(' ')}`);
            }
    
        } catch (err) {
            setError(err instanceof Error ? err.message : 'A critical error occurred while loading data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSaveData = async (type: 'movies' | 'categories' | 'about' | 'festival', dataToSave: any) => {
        setIsSaving(true);
        setSaveMessage('');
        setSaveError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type, data: dataToSave }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save.');
            setSaveMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} saved & published successfully!`);
            fetchAllData(password!); // Refresh all data after a successful save
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogin = async (e?: React.FormEvent | null, storedPassword?: string) => {
        e?.preventDefault();
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
                fetchAllData(passToTry);
            } else {
                setError('Invalid password.');
                setIsLoading(false);
            }
        } catch (err) {
            setError('An error occurred.');
            setIsLoading(false);
        }
    };
    
    const handleLogout = () => {
        sessionStorage.removeItem('adminPassword');
        setIsAuthenticated(false);
        setPassword('');
        setRole(null);
        setAllowedTabs([]);
        setError('');
    };

    useEffect(() => {
        if (!role) return;

        let tabs: string[] = [];
        if (role === 'super_admin' || role === 'master') {
            tabs = Object.keys(ALL_TABS);
        } else {
            // Default permissions for built-in roles if not defined in DB
            const defaultPermissions: Record<string, string[]> = {
                collaborator: ['movies', 'categories', 'pipeline', 'fallback'],
                festival_admin: ['festival'],
            };
            tabs = permissions[role] || defaultPermissions[role] || [];
        }
        
        setAllowedTabs(tabs);
        
        if (tabs.length > 0 && !tabs.includes(activeTab)) {
            setActiveTab(tabs[0]);
        } else if (tabs.length === 0) {
            setError("Your role does not have any permissions assigned.");
        }
    }, [role, permissions, activeTab]);

    // Renders the login form
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="w-full max-w-sm">
                    <form onSubmit={handleLogin} className="bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                        <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input pr-10"
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
                        </div>
                        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
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
    
    if (isLoading) {
        return <LoadingSpinner />;
    }

    const TabButton: React.FC<{ tabId: string, label: string }> = ({ tabId, label }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabId ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <div className="flex items-center gap-4">
                        {isSaving && <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-white"></div>}
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-gray-700 pb-4">
                   {allowedTabs.map(tabId => (
                        <TabButton key={tabId} tabId={tabId} label={ALL_TABS[tabId as keyof typeof ALL_TABS]} />
                   ))}
                </div>
                
                {error && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error}</div>}

                <div>
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data: any) => handleSaveData('movies', data)} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={(item) => console.log('Create movie from:', item)} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'payouts' && <AdminPayoutsTab />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={(newData) => handleSaveData('categories', newData)} isSaving={isSaving} />}
                    {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={setFestivalData} onConfigChange={setFestivalConfig} onSave={() => handleSaveData('festival', { config: festivalConfig, schedule: festivalData })} isSaving={isSaving} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (movie) => handleSaveData('movies', { [movie.key]: movie })} />}
                    {activeTab === 'about' && aboutData && <AboutEditor initialData={aboutData} onSave={(newData) => handleSaveData('about', newData)} isSaving={isSaving} />}
                    {activeTab === 'email' && <EmailSender />}
                    {activeTab === 'contracts' && <ContractsTab />}
                    {activeTab === 'monetization' && <MonetizationTab />}
                    {activeTab === 'security' && <SecurityTab />}
                    {activeTab === 'roku' && <RokuAdminTab />}
                    {activeTab === 'fallback' && <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />}
                    {activeTab === 'permissions' && (role === 'super_admin' || role === 'master') && 
                        <PermissionsManager 
                            allTabs={ALL_TABS}
                            initialPermissions={permissions}
                            onRefresh={() => fetchAllData(password)}
                        />
                    }
                </div>
            </div>
            
            {(saveMessage || saveError) && (
                <SaveStatusToast
                    message={saveMessage || saveError}
                    isError={!!saveError}
                    onClose={() => {
                        setSaveMessage('');
                        setSaveError('');
                    }}
                />
            )}
        </div>
    );
};

export default AdminPage;