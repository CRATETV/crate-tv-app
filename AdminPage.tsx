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
    security: 'Security',
    roku: 'Roku',
    fallback: 'Fallback Data',
    permissions: 'Permissions'
};


const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
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
                fetch('/api/get-live-data'),
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
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                            />
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
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-gray-700 pb-4">
                   {allowedTabs.map(tabId => (
                        <TabButton key={tabId} tabId={tabId} label={ALL_TABS[tabId as keyof typeof ALL_TABS]} />
                   ))}
                </div>
                
                {error && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error}</div>}

                <div>
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={(item) => console.log('Create movie from:', item)} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'payouts' && <AdminPayoutsTab />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={(newData) => console.log('Save categories:', newData)} />}
                    {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={setFestivalData} onConfigChange={setFestivalConfig} onSave={() => console.log('Save festival')} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (movie) => console.log('Save movie:', movie)} />}
                    {activeTab === 'about' && aboutData && <AboutEditor initialData={aboutData} onSave={(newData) => console.log('Save about:', newData)} />}
                    {activeTab === 'email' && <EmailSender />}
                    {activeTab === 'contracts' && <ContractsTab />}
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
        </div>
    );
};

export default AdminPage;