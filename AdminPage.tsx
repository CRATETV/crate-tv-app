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
import SocialKitModal from './components/SocialKitModal';

const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Daily Pulse',
    strategy: '🎯 Strategic Hub',
    mail: '✉️ Studio Mail',
    watchParty: '🍿 Watch Party',
    socialForge: '📱 Social Forge',
    discovery: '🛰️ Research Lab',
    intelligence: '🕵️ User Intel',
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    hero: '🎬 Hero',
    laurels: '🏆 Laurels',
    cratefest: '🎪 Crate Fest Config',
    vouchers: '🎫 Promo Codes',
    pitch: '📽️ Pitch Deck',
    categories: '📂 Categories',
    roku: '📺 Roku Deploy',
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
    const [socialKitFilm, setSocialKitFilm] = useState<Movie | null>(null);

    const allowedTabs = useMemo(() => {
        const isMaster = role === 'super_admin' || role === 'master';
        if (isMaster) return Object.keys(ALL_TABS);
        const specificTabs = permissions[role];
        if (specificTabs && specificTabs.length > 0) return specificTabs;
        return ['pulse'];
    }, [role, permissions]);

    useEffect(() => {
        if (isAuthenticated && !allowedTabs.includes(activeTab)) {
            setActiveTab(allowedTabs[0] || 'pulse');
        }
    }, [isAuthenticated, allowedTabs]);

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
            console.warn("Telemetry error:", err);
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
        const pass = sessionStorage.getItem('adminPassword');
        const name = sessionStorage.getItem('operatorName');
        try {
            const response = await fetch('/api/publish-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass, operatorName: name, type, data: dataToSave }),
            });
            if (response.ok) {
                setSaveMessage(`Sync Complete.`);
                await fetchAllData(pass!);
            }
        } catch (err) {
            setSaveMessage("Sync failed.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050505] text-white p-4">
                <form onSubmit={handleLogin} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-8 w-full max-w-sm">
                    <h1 className="text-xl font-black uppercase text-center text-gray-700">Studio Command</h1>
                    <div className="space-y-6">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Operator Key" className="form-input text-center bg-white/5" required />
                        <input type="text" value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Operator Identity" className="form-input text-center bg-white/5 uppercase" required />
                    </div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button className="submit-btn w-full !rounded-2xl py-4" type="submit">Establish Uplink</button>
                </form>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-10">
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Studio <span className="text-red-600">Command</span></h1>
                    <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="bg-white/5 text-gray-500 hover:text-white px-6 py-2.5 rounded-xl uppercase text-[10px] font-black border border-white/10">Log Out</button>
                </div>
                
                <div className="flex overflow-x-auto pb-4 mb-10 gap-2 scrollbar-hide">
                    {Object.entries(ALL_TABS).map(([tabId, label]) => allowedTabs.includes(tabId) && (
                        <button key={tabId} onClick={() => setActiveTab(tabId)} className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>{label}</button>
                    ))}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {activeTab === 'pulse' && <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />}
                    {activeTab === 'socialForge' && (
                        <div className="space-y-8 bg-white/5 p-12 rounded-[3.5rem] border border-white/10 shadow-2xl">
                             <h2 className="text-3xl font-black uppercase tracking-tighter italic">Social Media Asset Forge</h2>
                             <p className="text-gray-400">Generate FOMO-driven promotional copy for Facebook and Instagram based on upcoming events.</p>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* FIX: Explicitly cast Object.values(movies) to Movie[] to ensure 'm' is correctly typed as Movie instead of 'unknown', resolving compilation errors on key, title, and isWatchPartyEnabled */}
                                {(Object.values(movies) as Movie[]).filter(m => m.isWatchPartyEnabled).map(m => (
                                    <button key={m.key} onClick={() => setSocialKitFilm(m)} className="bg-black/60 p-6 rounded-3xl border border-red-600/30 text-left group hover:bg-red-600 transition-all">
                                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-red-500 group-hover:text-white mb-2">Live Event Active</p>
                                        <h4 className="text-xl font-black uppercase text-white leading-tight">{m.title}</h4>
                                        <p className="text-[10px] text-gray-500 group-hover:text-white/70 mt-2">Generate Campaign Assets →</p>
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'strategy' && <StrategicHub analytics={analytics} />}
                    {activeTab === 'mail' && <StudioMail analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={() => setActiveTab('movies')} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'roku' && <RokuDeployTab />}
                    {/* FIX: Cast movies to Movie[] for consistent typing when passing allMovies to HeroManager */}
                    {activeTab === 'hero' && <HeroManager allMovies={Object.values(movies) as Movie[]} featuredKeys={categories.featured?.movieKeys || []} onSave={(keys) => handleSaveData('categories', { featured: { title: 'Featured Films', movieKeys: keys } })} isSaving={isSaving} />}
                </div>
            </div>
            {socialKitFilm && <SocialKitModal title={socialKitFilm.title} synopsis={socialKitFilm.synopsis} director={socialKitFilm.director} poster={socialKitFilm.poster} onClose={() => setSocialKitFilm(null)} />}
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;