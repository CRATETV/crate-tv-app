import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, ActorSubmission, PayoutRequest } from './types';
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
// FIX: Changed to named import to match the export in ActorSubmissionsTab.tsx
import { ActorSubmissionsTab } from './components/ActorSubmissionsTab';
import { MoviePipelineTab } from './components/MoviePipelineTab';


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
    const [actorSubmissions, setActorSubmissions] = useState<ActorSubmission[]>([]);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);

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
                fetch('/api/get-actor-submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) })
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
                console.error('Failed to fetch live site data:', dataResResult.status === 'rejected' ? dataResResult.reason : `Status ${dataResResult.value?.status}`);
            }
    
            // Process pipeline data
            const pipelineResResult = results[1];
            if (pipelineResResult.status === 'fulfilled' && pipelineResResult.value.ok) {
                const pipelineData = await pipelineResResult.value.json();
                setPipeline(pipelineData.pipeline || []);
            } else {
                errors.push('Failed to fetch submission pipeline.');
                console.error('Failed to fetch pipeline data:', pipelineResResult.status === 'rejected' ? pipelineResResult.reason : `Status ${pipelineResResult.value?.status}`);
            }
    
            // Process actor submissions
            const actorSubmissionsResResult = results[2];
            if (actorSubmissionsResResult.status === 'fulfilled' && actorSubmissionsResResult.value.ok) {
                const actorSubmissionsData = await actorSubmissionsResResult.value.json();
                setActorSubmissions(actorSubmissionsData.submissions || []);
            } else {
                errors.push('Failed to fetch actor submissions.');
                console.error('Failed to fetch actor submissions:', actorSubmissionsResResult.status === 'rejected' ? actorSubmissionsResResult.reason : `Status ${actorSubmissionsResResult.value?.status}`);
            }
    
            // Process payouts
            const payoutsResResult = results[3];
            if (payoutsResResult.status === 'fulfilled' && payoutsResResult.value.ok) {
                const payoutsData = await payoutsResResult.value.json();
                setPayoutRequests(payoutsData.payoutRequests || []);
            } else {
                errors.push('Failed to fetch payout requests.');
                 console.error('Failed to fetch payouts:', payoutsResResult.status === 'rejected' ? payoutsResResult.reason : `Status ${payoutsResResult.value?.status}`);
            }
    
            if (errors.length > 0) {
                setError(`Could not load some data: ${errors.join(' ')}`);
            }
    
        } catch (err) {
            // This catch block is for network errors or other unexpected issues before Promise.allSettled runs
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
                <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
                <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-gray-700 pb-4">
                   <TabButton tabId="analytics" label="Analytics" />
                   <TabButton tabId="movies" label="Movies" />
                   <TabButton tabId="pipeline" label="Pipeline" />
                   <TabButton tabId="actorSubmissions" label="Actor Submissions" />
                   <TabButton tabId="payouts" label="Payouts" />
                   <TabButton tabId="categories" label="Categories" />
                   <TabButton tabId="festival" label="Festival" />
                   <TabButton tabId="watchParty" label="Watch Party" />
                   <TabButton tabId="about" label="About Page" />
                   <TabButton tabId="email" label="Email" />
                   <TabButton tabId="contracts" label="File Cabinet" />
                   <TabButton tabId="security" label="Security" />
                   <TabButton tabId="roku" label="Roku" />
                   <TabButton tabId="fallback" label="Fallback Data" />
                </div>
                
                {error && <div className="p-4 mb-4 text-red-300 bg-red-900/50 border border-red-700 rounded-md">{error}</div>}

                <div>
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={(item) => console.log('Create movie from:', item)} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'actorSubmissions' && <ActorSubmissionsTab submissions={actorSubmissions} onRefresh={() => fetchAllData(password)} />}
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
                </div>
            </div>
        </div>
    );
};

export default AdminPage;