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
        try {
            const [
                dataRes,
                pipelineRes,
                actorSubmissionsRes,
                payoutsRes
            ] = await Promise.all([
                fetch('/api/get-live-data'),
                fetch('/api/get-pipeline-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-actor-submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) })
            ]);

            if (!dataRes.ok || !pipelineRes.ok || !actorSubmissionsRes.ok || !payoutsRes.ok) {
                 throw new Error('Failed to fetch one or more data sources.');
            }
            
            const data = await dataRes.json();
            const pipelineData = await pipelineRes.json();
            const actorSubmissionsData = await actorSubmissionsRes.json();
            const payoutsData = await payoutsRes.json();

            setMovies(data.movies || {});
            setCategories(data.categories || {});
            setAboutData(data.aboutData || null);
            setFestivalData(data.festivalData || []);
            setFestivalConfig(data.festivalConfig || null);
            setPipeline(pipelineData.pipeline || []);
            setActorSubmissions(actorSubmissionsData.submissions || []);
            setPayoutRequests(payoutsData.payoutRequests || []);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data.');
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