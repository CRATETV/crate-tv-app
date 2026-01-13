
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, CrateFestConfig, AnalyticsData } from './types';
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
import TalentInquiriesTab from './components/TalentInquiriesTab';
import CrateFestEditor from './components/CrateFestEditor';
import PromoCodeManager from './components/PromoCodeManager';
import PermissionsManager from './components/PermissionsManager';
import EditorialManager from './components/EditorialManager';
import RokuDeployTab from './components/RokuDeployTab';
import UserIntelligenceTab from './components/UserIntelligenceTab';
import CrateFestAnalytics from './components/CrateFestAnalytics';
import FestivalAnalytics from './components/FestivalAnalytics';
import DiscoveryEngine from './components/DiscoveryEngine';
import StrategicHub from './components/StrategicHub';

const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Daily Pulse',
    strategy: '🎯 Strategic Hub',
    discovery: '🛰️ Research Lab',
    intelligence: '🕵️ User Intel',
    festivalAnalytics: '🍿 Festival Intel',
    crateFestAnalytics: '🎪 Crate Fest Intel',
    editorial: '🖋️ Editorial',
    mail: '✉️ Studio Mail',
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    inquiries: '🎭 Inquiries',
    analytics: '📊 Platform ROI',
    hero: '🎬 Hero',
    laurels: '🏆 Laurels',
    cratefest: '🎪 Crate Fest Config',
    vouchers: '🎫 Promo Codes',
    pitch: '📽️ Pitch Deck',
    categories: '📂 Categories',
    festival: '🍿 Film Festival Config',
    watchParty: '🍿 Watch Party',
    roku: '📺 Roku Deploy',
    about: '📄 About',
    permissions: '🔑 Permissions',
    security: '🛡️ Security',
    fallback: '💾 Fallback'
};

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState('viewer');
    const [operatorName, setOperatorName] = useState('');
    const [password, setPassword] = useState('');
    const [loginName, setLoginName] = useState(''); 
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
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    
    const [activeTab, setActiveTab] = useState('pulse');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const allowedTabs = useMemo(() => {
        const isMaster = role === 'super_admin' || role === 'master';
        if (isMaster) return Object.keys(ALL_TABS);
        if (role === 'festival_admin') return ['festival', 'festivalAnalytics', 'crateFestAnalytics'];
        const specificTabs = permissions[role];
        if (specificTabs && specificTabs.length > 0) return specificTabs;
        return ['pulse'];
    }, [role, permissions]);

    useEffect(() => {
        if (isAuthenticated && !allowedTabs.includes(activeTab)) {
            setActiveTab(allowedTabs[0] || 'pulse');
        }
    }, [isAuthenticated, allowedTabs]);

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash && ALL_TABS[hash] && allowedTabs.includes(hash)) {
                setActiveTab(hash);
            }
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, [allowedTabs]);

    const fetchAllData = useCallback(async (adminPassword: string) => {
        setIsLoading(true);
        try {
            const [liveDataRes, pipelineRes, analyticsRes, permsRes] = await Promise.all([
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
                }),
                fetch('/api/get-admin-permissions', {
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
            
            if (permsRes.ok) {
                const data = await permsRes.json();
                setPermissions(data.permissions || {});
            }

        } catch (err) {
            console.warn("Telemetry acquisition error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleLogin = async (e?: React.FormEvent | null) => {
        e?.preventDefault();
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, name: loginName }),
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('adminPassword', password);
                sessionStorage.setItem('operatorName', loginName);
                setRole(data.role);
                setOperatorName(loginName);
                setIsAuthenticated(true);
                fetchAllData(password);
            } else {
                setError('Invalid credentials.');
            }
        } catch (err) {
            setError('Auth node unreachable.');
        }
    };

    const handleSaveData = async (type: string, dataToSave: any) => {
        setIsSaving(true);
        setSaveMessage('');
        const pass = sessionStorage.getItem('adminPassword');
        const name = sessionStorage.getItem('operatorName');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass, operatorName: name, type, data: dataToSave }),
            });
            const result = await response.json();
            if (response.ok && result.success) {
                setSaveMessage(`Sync Complete.`);
                await fetchAllData(pass!);
            } else {
                throw new Error(result.error || "Operation rejected.");
            }
        } catch (err) {
            setSaveMessage(err instanceof Error ? err.message : "Sync failed.");
        } finally {
            setIsLoading(false);
            setIsSaving(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
                <div className="w-full max-w-sm">
                    <form onSubmit={handleLogin} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
                        <div className="text-center">
                            <h1 className="text-xl font-black uppercase tracking-[0.2em] text-gray-700">Studio Command</h1>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="form-label" htmlFor="password">Operator Key</label>
                                <div className="relative">
                                    <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="form-input text-center tracking-widest bg-white/5 border-white/10" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-500 hover:text-white transition-colors">
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Operator Identity</label>
                                <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Enter Your Name..." className="form-input text-center bg-white/5 border-white/10 uppercase font-black text-xs tracking-widest" required />
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{error}</p>}
                        <button className="submit-btn w-full !rounded-2xl py-4 bg-red-600" type="submit">Establish Uplink</button>
                    </form>
                </div>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 border-b border-white/5 pb-10">
                    <div className="flex items-center gap-6">
                         <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Studio <span className="text-red-600">Command</span></h1>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mt-2">OPERATOR: {operatorName}</p>
                         </div>
                    </div>
                    <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="bg-white/5 hover:bg-red-600 text-gray-400 hover:text-white font-black py-2.5 px-6 rounded-xl transition-all uppercase text-[10px] tracking-widest border border-white/10">Log Out</button>
                </div>
                
                <div className="flex overflow-x-auto pb-4 mb-10 gap-2 scrollbar-hide border-b border-white/5">
                    {Object.entries(ALL_TABS).map(([tabId, label]) => {
                        if (!allowedTabs.includes(tabId)) return null;
                        return (
                            <button key={tabId} onClick={() => setActiveTab(tabId)} className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all whitespace-nowrap border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-xl' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{label}</button>
                        );
                    })}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {activeTab === 'pulse' && <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />}
                    {activeTab === 'strategy' && <StrategicHub analytics={analytics} />}
                    {activeTab === 'discovery' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(d) => handleSaveData('categories', d)} />}
                    {activeTab === 'intelligence' && <UserIntelligenceTab movies={movies} onPrepareRecommendation={() => {}} />}
                    {activeTab === 'festivalAnalytics' && <FestivalAnalytics analytics={analytics} festivalData={festivalData} config={festivalConfig} />}
                    {activeTab === 'crateFestAnalytics' && <CrateFestAnalytics analytics={analytics} config={crateFestConfig} />}
                    {activeTab === 'editorial' && <EditorialManager allMovies={movies} />}
                    {activeTab === 'mail' && <StudioMail analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={() => setActiveTab('movies')} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'inquiries' && <TalentInquiriesTab />}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode={role === 'festival_admin' ? 'festival' : 'full'} />}
                    {activeTab === 'hero' && <HeroManager allMovies={Object.values(movies)} featuredKeys={categories.featured?.movieKeys || []} onSave={(keys) => handleSaveData('categories', { featured: { title: 'Featured Films', movieKeys: keys } })} isSaving={isSaving} />}
                    {activeTab === 'laurels' && < LaurelManager allMovies={Object.values(movies)} />}
                    {activeTab === 'cratefest' && <CrateFestEditor config={crateFestConfig!} allMovies={movies} pipeline={pipeline} onSave={(newConfig) => handleSaveData('settings', { crateFestConfig: newConfig })} isSaving={isSaving} />}
                    {activeTab === 'vouchers' && <PromoCodeManager isAdmin={true} targetFilms={Object.values(movies)} targetBlocks={[]} />}
                    {activeTab === 'pitch' && <PitchDeckManager onSave={(settings) => handleSaveData('settings', settings)} isSaving={isSaving} />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies)} onSave={(newData) => handleSaveData('categories', newData)} isSaving={isSaving} />}
                    {activeTab === 'festival' && festivalConfig && <FestivalEditor data={festivalData} config={festivalConfig} allMovies={movies} onDataChange={(d) => setFestivalData(d)} onConfigChange={(c) => setFestivalConfig(c)} onSave={() => handleSaveData('festival', { config: festivalConfig, schedule: festivalData })} isSaving={isSaving} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'roku' && <RokuDeployTab />}
                    {activeTab === 'about' && aboutData && <AboutEditor initialData={aboutData} onSave={(newData) => handleSaveData('about', newData)} isSaving={isSaving} />}
                    {activeTab === 'permissions' && <PermissionsManager allTabs={ALL_TABS} initialPermissions={permissions} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'security' && <SecurityTerminal />}
                    {activeTab === 'fallback' && <FallbackGenerator movies={movies} categories={categories} festivalData={festivalData} festivalConfig={festivalConfig} aboutData={aboutData} />}
                </div>
            </div>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
