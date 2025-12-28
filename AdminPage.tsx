import React, { useState, useEffect, useCallback } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, PayoutRequest } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import AboutEditor from './components/AboutEditor';
import FestivalEditor from './components/FestivalEditor';
import AnalyticsPage from './components/AnalyticsPage';
import GrowthAnalyticsTab from './components/GrowthAnalyticsTab';
import WatchPartyManager from './components/WatchPartyManager';
import SecurityTab from './components/SecurityTab';
import FallbackGenerator from './components/FallbackGenerator';
import EmailSender from './components/EmailSender';
import AdminPayoutsTab from './components/AdminPayoutsTab';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import PermissionsManager from './components/PermissionsManager';
import SaveStatusToast from './components/SaveStatusToast';
import MonetizationTab from './components/MonetizationTab';
import HeroManager from './components/HeroManager';
import LaurelManager from './components/LaurelManager';
import JuryPortal from './components/JuryPortal';
import PitchDeckPage from './components/PitchDeckPage';

const ALL_TABS: Record<string, string> = {
    analytics: '📊 Platform Analytics',
    growth: '✨ Growth Intelligence',
    pitchDeck: '🚀 LIFT Labs Pitch',
    jury: '⚖️ Grand Jury',
    hero: '🎬 Hero Spotlight',
    movies: '🎞️ Movies',
    pipeline: '📥 Pipeline',
    laurels: '🏆 Laurel Awards',
    payouts: '💸 Payouts',
    categories: '📂 Categories',
    festival: '🎪 Festival',
    watchParty: '🍿 Watch Party',
    about: '📄 About Page',
    email: '✉️ Email',
    monetization: '💰 AI Monetization',
    security: '🛡️ Security',
    fallback: '💾 Fallback Data',
    permissions: '🔑 Permissions'
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
    const [pipelineItemToConvert, setPipelineItemToConvert] = useState<MoviePipelineEntry | null>(null);


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
        const warnings: string[] = [];
    
        try {
            const results = await Promise.allSettled([
                fetch('/api/get-live-data?noCache=true'),
                fetch('/api/get-pipeline-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }),
                fetch('/api/get-admin-permissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) })
            ]);
    
            // Process live data (Critical)
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
    
            // Process pipeline data (Non-critical)
            const pipelineResResult = results[1];
            if (pipelineResResult.status === 'fulfilled') {
                if (pipelineResResult.value.ok) {
                    const pipelineData = await pipelineResResult.value.json();
                    setPipeline(pipelineData.pipeline || []);
                    if (pipelineData.warning) warnings.push(pipelineData.warning);
                } else if (pipelineResResult.value.status !== 401) {
                    // Only show error if it wasn't a standard 401 (Not allowed)
                    errors.push('Failed to fetch submission pipeline.');
                }
            }
    
            // Process payouts (Non-critical)
            const payoutsResResult = results[2];
            if (payoutsResResult.status === 'fulfilled') {
                if (payoutsResResult.value.ok) {
                    const payoutsData = await payoutsResResult.value.json();
                    setPayoutRequests(payoutsData.payoutRequests || []);
                    if (payoutsData.warning) warnings.push(payoutsData.warning);
                } else if (payoutsResResult.value.status !== 401) {
                    errors.push('Failed to fetch payout requests.');
                }
            }

            // Process permissions (Critical)
            const permsResResult = results[3];
            if (permsResResult.status === 'fulfilled') {
                if (permsResResult.value.ok) {
                    const permsData = await permsResResult.value.json();
                    setPermissions(permsData.permissions || {});
                    if (permsData.warning) warnings.push(permsData.warning);
                } else if (permsResResult.value.status !== 401) {
                    errors.push('Failed to fetch user role permissions.');
                }
            }
    
            if (errors.length > 0) {
                setError(`Notification: ${errors.join(' ')}`);
            } else if (warnings.length > 0) {
                 // Use first significant warning for user guidance
                 setError(`System Warning: ${warnings[0]}`);
            }
    
        } catch (err) {
            setError(err instanceof Error ? err.message : 'A critical error occurred while loading data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSaveData = async (type: 'movies' | 'categories' | 'about' | 'festival', dataToSave: any, pipelineItemIdToDelete?: string | null) => {
        setIsSaving(true);
        setSaveMessage('');
        setSaveError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type, data: dataToSave, pipelineItemIdToDelete }),
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

    const handleDeleteMovie = async (movieKey: string) => {
        setIsSaving(true);
        setSaveMessage('');
        setSaveError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type: 'delete_movie', data: { key: movieKey } }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete movie.');
            setSaveMessage(`Movie deleted & published successfully!`);
            fetchAllData(password!); // Refresh data
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'An error occurred during deletion.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetNowStreaming = async (movieKey: string) => {
        setIsSaving(true);
        setSaveMessage('');
        setSaveError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, type: 'set_now_streaming', data: { key: movieKey } }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to set Now Streaming.');
            setSaveMessage(`Successfully set new "Now Streaming" film!`);
            fetchAllData(password!); // Refresh all data after a successful save
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'An error occurred while setting Now Streaming.');
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
                jury: ['jury', 'pipeline']
            };
            tabs = permissions[role] || defaultPermissions[role] || [];
        }
        
        setAllowedTabs(tabs);
        
        if (tabs.length > 0 && !tabs.includes(activeTab)) {
            setActiveTab(tabs[0]);
        } else if (tabs.length === 0 && !error) {
            setError("Your role does not have any permissions assigned.");
        }
    }, [role, permissions, activeTab, error]);

    // Renders the login form
    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="w-full max-sm px-4">
                    <form onSubmit={handleLogin} className="bg-gray-800 shadow-md rounded-2xl px-8 pt-6 pb-8 mb-4 border border-white/5">
                        <div className="text-center mb-6">
                            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-24 mx-auto mb-2 opacity-50" alt="Crate TV" />
                            <h1 className="text-2xl font-black uppercase tracking-tighter">Command Center</h1>
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2" htmlFor="password">Access Token</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input pr-10 !bg-black/40"
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
                        {error && <p className="text-red-500 text-xs italic mb-4 font-bold text-center">{error}</p>}
                        <div className="flex items-center justify-between">
                            <button className="submit-btn w-full !rounded-xl" type="submit">
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
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tabId ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                         <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-16 h-auto" alt="Logo" />
                         <h1 className="text-3xl font-black uppercase tracking-tighter">Admin <span className="text-red-600">Console</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {isSaving && <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-red-500"></div>}
                        <button
                            onClick={handleLogout}
                            className="bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white font-black py-2 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/5"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-10">
                   {allowedTabs.map(tabId => (
                        <TabButton key={tabId} tabId={tabId} label={ALL_TABS[tabId as keyof typeof ALL_TABS]} />
                   ))}
                </div>
                
                {error && (
                    <div className={`p-4 mb-8 rounded-xl flex items-center gap-3 animate-[fadeIn_0.5s_ease-out] ${error.startsWith('System Warning:') ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'}`}>
                         <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         <span className="text-xs font-bold leading-relaxed">{error}</span>
                    </div>
                )}

                <div className="animate-[fadeIn_0.5s_ease-out]">
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" onNavigateToGrowth={() => setActiveTab('growth')} />}
                    {activeTab === 'growth' && <GrowthAnalyticsTab />}
                    {activeTab === 'pitchDeck' && <PitchDeckPage />}
                    {activeTab === 'jury' && <JuryPortal pipeline={pipeline} />}
                    {activeTab === 'hero' && <HeroManager allMovies={Object.values(movies)} featuredKeys={categories.featured?.movieKeys || []} onSave={(keys) => handleSaveData('categories', { featured: { title: 'Featured Films', movieKeys: keys } })} isSaving={isSaving} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data, pipelineId) => handleSaveData('movies', data, pipelineId)} onDeleteMovie={handleDeleteMovie} onSetNowStreaming={handleSetNowStreaming} movieToCreate={pipelineItemToConvert} onCreationDone={() => setPipelineItemToConvert(null)} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={(item) => { setPipelineItemToConvert(item); setActiveTab('movies'); }} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'laurels' && <LaurelManager allMovies={Object.values(movies)} />}
                    {activeTab === 'payouts' && <AdminPayoutsTab />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={(newData) => handleSaveData('categories', newData)} isSaving={isSaving} />}
                    {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={setFestivalData} onConfigChange={setFestivalConfig} onSave={() => handleSaveData('festival', { config: festivalConfig, schedule: festivalData })} isSaving={isSaving} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (movie) => handleSaveData('movies', { [movie.key]: movie })} />}
                    {activeTab === 'about' && aboutData && <AboutEditor initialData={aboutData} onSave={(newData) => handleSaveData('about', newData)} isSaving={isSaving} />}
                    {activeTab === 'email' && <EmailSender />}
                    {activeTab === 'monetization' && <MonetizationTab />}
                    {activeTab === 'security' && <SecurityTab />}
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