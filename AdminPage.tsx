
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, CrateFestConfig, AnalyticsData } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import AnalyticsPage from './components/AnalyticsPage';
import WatchPartyManager from './components/WatchPartyManager';
import SecurityTerminal from './components/SecurityTerminal';
import DailyPulse from './components/DailyPulse';
import StudioMail from './components/StudioMail';
import SaveStatusToast from './components/SaveStatusToast';
import LaurelManager from './components/LaurelManager';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import CrateFestEditor from './components/CrateFestEditor';
import FestivalEditor from './components/FestivalEditor';
import PromoCodeManager from './components/PromoCodeManager';
import PermissionsManager from './components/PermissionsManager';
import EditorialManager from './components/EditorialManager';
import RokuDeployTab from './components/RokuDeployTab';
import DiscoveryEngine from './components/DiscoveryEngine';
import CrateFestAnalytics from './components/CrateFestAnalytics';
import FestivalAnalytics from './components/FestivalAnalytics';
import JuryRoomTab from './components/JuryRoomTab';
import AcademyIntelTab from './components/AcademyIntelTab';
import OneTimePayoutTerminal from './components/OneTimePayoutTerminal';

const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Daily Pulse',
    mail: '✉️ Studio Mail',
    editorial: '✍️ Editorial Lab',
    watchParty: '🍿 Watch Party',
    discovery: '🛰️ Research Lab',
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    jury: '⚖️ Jury Hub',
    festival: '🎪 Festival Manager',
    cratefest: '🎪 Crate Fest Config',
    vouchers: '🎫 Promo Codes',
    festIntel: '📊 Fest Analytics',
    categories: '📂 Categories',
    laurels: '🏆 Laurel Forge',
    roku: '📺 Roku Deploy',
    permissions: '🔑 Permissions',
    security: '🛡️ Security'
};

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState('viewer');
    const [password, setPassword] = useState('');
    const [loginName, setLoginName] = useState(''); 
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // Metadata for specialized logins
    const [payoutContext, setPayoutContext] = useState<{ director: string; role: string } | null>(null);

    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
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
                // Fix: use permsRes instead of undefined res
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
                
                if (data.role === 'director_payout') {
                    setPayoutContext({ director: data.targetDirector, role: data.role });
                    setIsAuthenticated(true);
                    // Minimal load for payout view
                    const liveDataRes = await fetch(`/api/get-live-data?t=${Date.now()}`);
                    const liveData = await liveDataRes.json();
                    setMovies(liveData.movies || {});
                    setIsLoading(false);
                } else {
                    setIsAuthenticated(true);
                    fetchAllData(password);
                }
            } else {
                setError('Authentication Failed: Invalid Node Key.');
            }
        } catch (err) {
            setError('Auth Node Unreachable.');
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
                setSaveMessage(`Manifest Synchronized.`);
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 w-full max-w-md space-y-12 animate-[fadeIn_0.8s_ease-out]">
                    <div className="text-center space-y-4">
                        <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" className="w-40 mx-auto drop-shadow-2xl" alt="Crate" />
                        <div className="h-px w-20 bg-red-600 mx-auto"></div>
                        <h1 className="text-sm font-black uppercase tracking-[0.5em] text-gray-500">Infrastructure Terminal</h1>
                    </div>

                    <form onSubmit={handleLogin} className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[3rem] shadow-2xl space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">Operator Key</label>
                                <div className="relative group">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="••••••••" 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-xl tracking-widest font-mono text-white focus:border-red-600 transition-all outline-none" 
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.022 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 ml-2">Operator Handle</label>
                                <input 
                                    type="text" 
                                    value={loginName} 
                                    onChange={(e) => setLoginName(e.target.value)} 
                                    placeholder="e.g. ARCHITECT_01" 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-black uppercase tracking-widest text-white focus:border-red-600 transition-all outline-none" 
                                    required 
                                />
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-shake">{error}</p>}
                        <button 
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-2xl shadow-red-900/40 transition-all transform active:scale-95" 
                            type="submit"
                        >
                            Authorize Session
                        </button>
                    </form>
                    <p className="text-[8px] font-black text-gray-800 uppercase tracking-[0.5em] text-center">Crate TV // Studio Layer V4.1 // Secure Access Only</p>
                </div>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner />;

    if (role === 'director_payout' && payoutContext) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 md:p-20">
                <OneTimePayoutTerminal 
                    directorName={payoutContext.director} 
                    onLogout={() => { sessionStorage.clear(); window.location.reload(); }}
                    movies={movies}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex justify-between items-center mb-12 border-b border-white/5 pb-10">
                    <div className="flex items-center gap-6">
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Studio <span className="text-red-600">Command</span></h1>
                        <div className="bg-red-600/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Active Session: {sessionStorage.getItem('operatorName')}</span>
                        </div>
                    </div>
                    <button onClick={() => { sessionStorage.clear(); window.location.reload(); }} className="bg-white/5 text-gray-500 hover:text-white px-6 py-2.5 rounded-xl uppercase text-[10px] font-black border border-white/10 transition-all">Terminate Uplink</button>
                </div>
                
                <div className="flex overflow-x-auto pb-4 mb-10 gap-2 scrollbar-hide">
                    {Object.entries(ALL_TABS).map(([tabId, label]) => allowedTabs.includes(tabId) && (
                        <button 
                            key={tabId} 
                            onClick={() => setActiveTab(tabId)} 
                            className={`px-8 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-600 hover:text-white'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {activeTab === 'pulse' && <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'jury' && (
                        <div className="space-y-16">
                            <JuryRoomTab pipeline={pipeline} />
                            <AcademyIntelTab pipeline={pipeline} movies={movies} />
                        </div>
                    )}
                    {activeTab === 'festival' && (
                        <FestivalEditor 
                            data={festivalData} 
                            config={festivalConfig || { isFestivalLive: false, title: '', description: '', startDate: '', endDate: '' }} 
                            allMovies={movies}
                            onDataChange={(d) => setFestivalData(d)}
                            onConfigChange={(c) => setFestivalConfig(c)}
                            onSave={() => handleSaveData('festival', { config: festivalConfig, data: festivalData })}
                            isSaving={isSaving}
                        />
                    )}
                    {activeTab === 'cratefest' && <CrateFestEditor config={crateFestConfig || { isActive: false, title: '', tagline: '', startDate: '', endDate: '', passPrice: 15, movieBlocks: [] }} allMovies={movies} pipeline={pipeline} onSave={(c) => handleSaveData('settings', { crateFestConfig: c })} isSaving={isSaving} />}
                    {activeTab === 'editorial' && <EditorialManager allMovies={movies} />}
                    {activeTab === 'mail' && <StudioMail analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={() => setActiveTab('movies')} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    {activeTab === 'discovery' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(c) => handleSaveData('categories', c)} />}
                    {activeTab === 'festIntel' && (
                        <div className="space-y-16">
                            <FestivalAnalytics analytics={analytics} festivalData={festivalData} config={festivalConfig} />
                            <CrateFestAnalytics analytics={analytics} config={crateFestConfig} />
                        </div>
                    )}
                    {activeTab === 'vouchers' && <PromoCodeManager isAdmin={true} targetFilms={Object.values(movies) as Movie[]} />}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies) as Movie[]} onSave={(c) => handleSaveData('categories', c)} isSaving={isSaving} />}
                    {activeTab === 'laurels' && <LaurelManager allMovies={Object.values(movies) as Movie[]} />}
                    {activeTab === 'roku' && <RokuDeployTab />}
                    {activeTab === 'permissions' && <PermissionsManager allTabs={ALL_TABS} initialPermissions={permissions} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    {activeTab === 'security' && <SecurityTerminal />}
                </div>
            </div>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
