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
import UserTerminal from './components/UserTerminal';
import DailyPulse from './components/DailyPulse';
import FallbackGenerator from './components/FallbackGenerator';
import CommunicationsTerminal from './components/CommunicationsTerminal';
import SaveStatusToast from './components/SaveStatusToast';
import MonetizationTab from './components/MonetizationTab';
import HeroManager from './components/HeroManager';
import LaurelManager from './components/LaurelManager';
import PitchDeckManager from './components/PitchDeckManager';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import JuryRoomTab from './components/JuryRoomTab';
import TalentInquiriesTab from './components/TalentInquiriesTab';
import CrateFestEditor from './components/CrateFestEditor';
import PromoCodeManager from './components/PromoCodeManager';
import DiscoveryEngine from './components/DiscoveryEngine';

const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Daily Pulse',
    intelligence: '🧠 Intelligence',
    comms: '✉️ Dispatch',
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    inquiries: '🎭 Inquiries',
    users: '👤 User Terminal',
    jury: '⚖️ Jury Room',
    analytics: '📊 Analytics',
    hero: '🎬 Hero',
    laurels: '🏆 Laurels',
    cratefest: '🎪 Crate Fest',
    vouchers: '🎫 Promo Codes',
    pitch: '📽️ Pitch Deck',
    partners: '🤝 Partners',
    categories: '📂 Categories',
    festival: '🍿 Film Festival',
    watchParty: '🍿 Watch Party',
    about: '📄 About',
    monetization: '💰 Revenue',
    security: '🛡️ Security',
    fallback: '💾 Fallback'
};

const PartnersTab: React.FC = () => (
    <div className="space-y-10 animate-[fadeIn_0.4s_ease-out]">
        <div className="bg-gray-900 border border-white/5 p-10 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-6">Marketplace Connectivity</h2>
            <p className="text-gray-400 mb-10 max-w-2xl">Use these technical details when applying to be a "Buyer" or "Channel Partner" on major film aggregators.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Filmhub</h3>
                    <p className="text-sm text-gray-500">Apply as a "Streaming Channel". Once approved, filmmakers can opt-in to Crate TV via their dashboard.</p>
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Status</p>
                        <p className="text-sm font-bold text-gray-300">Ready for Application</p>
                    </div>
                </div>
                <div className="p-8 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Bitmax / Quiver</h3>
                    <p className="text-sm text-gray-500">Traditional delivery partners. Provide them with our Roku SDK Spec to receive broadcast-ready masters.</p>
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Status</p>
                        <p className="text-sm font-bold text-gray-300">Spec Active</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 bg-black/40 p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4">Crate TV Channel Spec</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-[11px]">
                    <div className="space-y-1">
                        <p className="text-gray-600 uppercase font-black">Video Bitrate</p>
                        <p className="text-gray-300">10Mbps+ Recommended</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 uppercase font-black">Format</p>
                        <p className="text-gray-300">MP4 / H.264 (AAC Audio)</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 uppercase font-black">Native Resolution</p>
                        <p className="text-gray-300">1080p / 4K Ready</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-gray-600 uppercase font-black">Feed Endpoint</p>
                        <p className="text-gray-300">/api/roku-feed</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

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
    const [partyStates, setPartyStates] = useState<Record<string, WatchPartyState>>({});
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [activeTab, setActiveTab] = useState('pulse');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Hash-based navigation for deep-links like "Broadcast Update"
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
                            <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="form-input text-center tracking-widest bg-white/5 border-white/10" required />
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
                    {activeTab === 'intelligence' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(newCats) => handleSaveData('categories', newCats)} />}
                    {activeTab === 'comms' && <CommunicationsTerminal analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(password)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={(item) => setActiveTab('movies')} onRefresh={() => fetchAllData(password)} />}
                    {activeTab === 'inquiries' && <TalentInquiriesTab />}
                    {activeTab === 'users' && <UserTerminal />}
                    {activeTab === 'jury' && <JuryRoomTab pipeline={pipeline} />}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'hero' && <HeroManager allMovies={Object.values(movies)} featuredKeys={categories.featured?.movieKeys || []} onSave={(keys) => handleSaveData('categories', { featured: { title: 'Featured Films', movieKeys: keys } })} isSaving={isSaving} />}
                    {activeTab === 'laurels' && <LaurelManager allMovies={Object.values(movies)} />}
                    {activeTab === 'cratefest' && <CrateFestEditor config={crateFestConfig!} allMovies={movies} pipeline={pipeline} onSave={(newConfig) => handleSaveData('settings', { crateFestConfig: newConfig })} isSaving={isSaving} />}
                    {activeTab === 'vouchers' && <PromoCodeManager isAdmin={true} targetFilms={Object.values(movies)} targetBlocks={[]} />}
                    {activeTab === 'pitch' && <PitchDeckManager onSave={(settings) => handleSaveData('settings', settings)} isSaving={isSaving} />}
                    {activeTab === 'partners' && <PartnersTab />}
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