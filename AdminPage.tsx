
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, CrateFestConfig, WatchPartyState, AnalyticsData } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import AboutEditor from './components/AboutEditor';
import FestivalEditor from './components/FestivalEditor';
import AnalyticsPage from './components/AnalyticsPage';
import WatchPartyManager from './components/WatchPartyManager';
import SecurityTerminal from './components/SecurityTerminal';
import DailyPulse from './components/DailyPulse';
import FallbackGenerator from './components/FallbackGenerator';
import StudioMail from './components/StudioMail';
import SaveStatusToast from './components/SaveStatusToast';
import HeroManager from './components/HeroManager';
import LaurelManager from './components/LaurelManager';
import PitchDeckManager from './components/PitchDeckManager';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import JuryRoomTab from './components/JuryRoomTab';
import TalentInquiriesTab from './components/TalentInquiriesTab';
import CrateFestEditor from './components/CrateFestEditor';
import PromoCodeManager from './components/PromoCodeManager';
import DiscoveryEngine from './components/DiscoveryEngine';
import UserIntelligenceTab from './components/UserIntelligenceTab';

const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Daily Pulse',
    users: '👥 User Intelligence',
    intelligence: '🧠 Intelligence',
    mail: '✉️ Studio Mail',
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    inquiries: '🎭 Inquiries',
    jury: '⚖️ Jury Room',
    analytics: '📊 Analytics',
    hero: '🎬 Hero',
    laurels: '🏆 Laurels',
    cratefest: '🎪 Crate Fest',
    vouchers: '🎫 Promo Codes',
    pitch: '📽️ Pitch Deck',
    categories: '📂 Categories',
    festival: '🍿 Film Festival',
    watchParty: '🍿 Watch Party',
    about: '📄 About',
    security: '🛡️ Security',
    fallback: '💾 Fallback'
};

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [aboutData, setAboutData] = useState<AboutData | null>(null);
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [crateFestConfig, setCrateFestConfig] = useState<CrateFestConfig | null>(null);
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [activeTab, setActiveTab] = useState('pulse');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && ALL_TABS[hash]) {
                setActiveTab(hash);
            }
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    const fetchAllData = useCallback(async (adminPassword: string) => {
        setIsLoading(true);
        try {
            const [liveDataRes, pipelineRes, analyticsRes] = await Promise.all([
                fetch(`/api/get-live-data?noCache=true&t=${Date.now()}`),
                fetch('/api/get-pipeline-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                }),
                fetch('/api/get-sales-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                })
            ]);

            if (liveDataRes.ok) {
                const data = await liveDataRes.json();
                setMovies(data.movies || {});
                setCategories(data.categories || {});
                setAboutData(data.aboutData || null);
                setFestivalData(data.festivalData || []);
                setFestivalConfig(data.festivalConfig || null);
                if (data.settings?.crateFestConfig) setCrateFestConfig(data.settings.crateFestConfig);
            }

            if (pipelineRes.ok) {
                const data = await pipelineRes.json();
                setPipeline(data.pipeline || []);
            }

            if (analyticsRes.ok) {
                const data = await analyticsRes.json();
                setAnalytics(data.analyticsData);
            }

        } catch (err) {
            console.warn("Telemetry acquisition error:", err);
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
                fetchAllData(passToTry);
            } else {
                setError('Invalid credentials.');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Auth node unreachable.');
            setIsLoading(false);
        }
    };

    const handleSaveData = async (type: string, dataToSave: any) => {
        setIsSaving(true);
        setSaveMessage('');
        const pass = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass, type, data: dataToSave }),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setSaveMessage(`Sync Complete.`);
                await fetchAllData(pass!);
            } else {
                throw new Error(result.error || "Operation rejected by server.");
            }
        } catch (err) {
            setSaveMessage(err instanceof Error ? err.message : "Synchronization failed.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrepareRecommendation = (email: string, draft: string) => {
        // Switch to mail tab and pass data via session or some state
        // For simplicity, we just navigate. In a real app we'd prefill.
        setActiveTab('mail');
        // Prefilling technically requires a bit more lift but we can signal it.
        sessionStorage.setItem('crate_mail_prefill_email', email);
        sessionStorage.setItem('crate_mail_prefill_body', draft);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
                <div className="w-full max-w-sm">
                    <form onSubmit={handleLogin} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
                        <div className="text-center mb-10">
                            <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-32 mx-auto mb-6" alt="Crate TV" />
                            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-gray-700">Studio Command</h1>
                        </div>
                        <div className="mb-8 relative">
                            <label className="form-label" htmlFor="password">Operator Key</label>
                            <div className="relative">
                                <input 
                                    id="password" 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="form-input text-center tracking-widest bg-white/5 border-white/10 pr-12" 
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-white transition-colors"
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
                        </div>
                        {error && <p className="text-red-500 text-[10px] font-bold mb-6 text-center uppercase tracking-widest">{error}</p>}
                        <button className="submit-btn w-full !rounded-2xl py-4 bg-red-600" type="submit">Establish Uplink</button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 border-b border-white/5 pb-10">
                    <div className="flex items-center gap-6">
                         <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" className="w-20" alt="Logo" />
                         <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Studio <span className="text-red-600">Command</span></h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-[9px] font-black uppercase tracking-widest text-green-500">Global Cluster Stable</p>
                            </div>
                         </div>
                    </div>
                    <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10">Log Out</button>
                </div>
                
                <div className="flex overflow-x-auto pb-4 mb-10 gap-2 scrollbar-hide border-b border-white/5">
                   {Object.entries(ALL_TABS).map(([tabId, label]) => (
                        <button key={tabId} onClick={() => setActiveTab(tabId)} className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all whitespace-nowrap border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-xl' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{label}</button>
                   ))}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {activeTab === 'pulse' && <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />}
                    {activeTab === 'users' && <UserIntelligenceTab movies={movies} onPrepareRecommendation={handlePrepareRecommendation} />}
                    {activeTab === 'intelligence' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(newCats) => handleSaveData('categories', newCats)} />}
                    {activeTab === 'mail' && <StudioMail analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={(item) => setActiveTab('movies')} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'inquiries' && <TalentInquiriesTab />}
                    {activeTab === 'jury' && <JuryRoomTab pipeline={pipeline} />}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'hero' && <HeroManager allMovies={Object.values(movies)} featuredKeys={categories.featured?.movieKeys || []} onSave={(keys) => handleSaveData('categories', { featured: { title: 'Featured Films', movieKeys: keys } })} isSaving={isSaving} />}
                    {activeTab === 'laurels' && <LaurelManager allMovies={Object.values(movies)} />}
                    {activeTab === 'cratefest' && <CrateFestEditor config={crateFestConfig!} allMovies={movies} pipeline={pipeline} onSave={(newConfig) => handleSaveData('settings', { crateFestConfig: newConfig })} isSaving={isSaving} />}
                    {activeTab === 'vouchers' && <PromoCodeManager isAdmin={true} targetFilms={Object.values(movies)} targetBlocks={[]} />}
                    {activeTab === 'pitch' && <PitchDeckManager onSave={(settings) => handleSaveData('settings', settings)} isSaving={isSaving} />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={(newData) => handleSaveData('categories', newData)} isSaving={isSaving} />}
                    {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={(d) => setFestivalData(d)} onConfigChange={(c) => setFestivalConfig(c)} onSave={() => handleSaveData('festival', { config: festivalConfig, schedule: festivalData })} isSaving={isSaving} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'about' && aboutData && <AboutEditor initialData={aboutData} onSave={(newData) => handleSaveData('about', newData)} isSaving={isSaving} />}
                    {activeTab === 'security' && <SecurityTerminal />}
                    {activeTab === 'fallback' && <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />}
                </div>
            </div>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
