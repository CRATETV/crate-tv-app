
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, CrateFestConfig, AnalyticsData } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import MovieEditor from './components/MovieEditor';
import CategoryEditor from './components/CategoryEditor';
import WatchPartyManager from './components/WatchPartyManager';
import SecurityTerminal from './components/SecurityTerminal';
import DailyPulse from './components/DailyPulse';
import StudioMail from './components/StudioMail';
import CommunicationsTerminal from './components/CommunicationsTerminal';
import SaveStatusToast from './components/SaveStatusToast';
import LaurelManager from './components/LaurelManager';
import { MoviePipelineTab } from './components/MoviePipelineTab';
import CrateFestEditor from './components/CrateFestEditor';
import FestivalEditor from './components/FestivalEditor';
import PromoCodeManager from './components/PromoCodeManager';
import PermissionsManager from './components/PermissionsManager';
import EditorialManager from './components/EditorialManager';
import RokuManagementTab from './components/RokuManagementTab';
import RokuForge from './components/RokuForge';
import DiscoveryEngine from './components/DiscoveryEngine';
import CrateFestAnalytics from './components/CrateFestAnalytics';
import FestivalAnalytics from './components/FestivalAnalytics';
import JuryRoomTab from './components/JuryRoomTab';
import AcademyIntelTab from './components/AcademyIntelTab';
import OneTimePayoutTerminal from './components/OneTimePayoutTerminal';
import AdminPayoutsTab from './components/AdminPayoutsTab';
import UserIntelligenceTab from './components/UserIntelligenceTab';
import AnalyticsPage from './components/AnalyticsPage';

const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Daily Pulse',
    mail: '✉️ Studio Mail',
    dispatch: '🛰️ Dispatch',
    intel: '🧠 User Intel',
    editorial: '✍️ Editorial Lab',
    watchParty: '🍿 Watch Party',
    discovery: '🔬 Research Lab',
    movies: '🎞️ Catalog',
    pipeline: '📥 Pipeline',
    jury: '⚖️ Jury Hub',
    payouts: '💰 Payouts',
    festHub: '🎪 Festival Hub',
    crateFestHub: '🎟️ Crate Fest Hub',
    vouchers: '🎫 Promo Codes',
    analytics: '📊 Platform Stats',
    categories: '📂 Categories',
    laurels: '🏆 Laurel Forge',
    roku: '📺 Roku Control',
    rokuForge: '🔮 Roku Forge AI',
    permissions: '🔑 Permissions',
    security: '🛡️ Security'
};

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState('viewer');
    const [assignedJobTitle, setAssignedJobTitle] = useState('');
    const [password, setPassword] = useState('');
    const [loginName, setLoginName] = useState(''); 
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const [payoutContext, setPayoutContext] = useState<{ name: string; type: string; role: string } | null>(null);

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
                sessionStorage.setItem('operatorName', loginName || (data.role === 'director_payout' ? data.targetDirector : 'ARCHITECT'));
                setRole(data.role);
                setAssignedJobTitle(data.jobTitle || '');
                
                if (data.role === 'director_payout') {
                    setPayoutContext({ name: data.targetDirector, type: data.payoutType || 'filmmaker', role: data.role });
                    setIsAuthenticated(true);
                    const liveDataRes = await fetch(`/api/get-live-data?t=${Date.now()}`);
                    const liveData = await liveDataRes.json();
                    setMovies(liveData.movies || {});
                    setFestivalData(liveData.festivalData || []);
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

    const handleLogout = () => {
        sessionStorage.clear();
        window.location.reload();
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
            setIsLoading(false);
            setIsSaving(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none"></div>
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
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" /></svg>
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
                </div>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner />;

    if (role === 'director_payout' && payoutContext) {
        return (
            <div className="min-h-screen bg-[#050505] text-white p-6 md:p-20">
                <OneTimePayoutTerminal 
                    targetName={payoutContext.name} 
                    targetType={payoutContext.type}
                    onLogout={() => { sessionStorage.clear(); window.location.reload(); }}
                    movies={movies}
                    festivalData={festivalData}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/5 pb-10 gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Studio <span className="text-red-600">Command</span></h1>
                        <div className="flex flex-col gap-1">
                            <div className="bg-red-600/10 border border-red-500/20 px-3 py-1.5 rounded-xl flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Active Session: {sessionStorage.getItem('operatorName')}</span>
                            </div>
                            {assignedJobTitle && (
                                <div className="bg-indigo-600/10 border border-indigo-500/20 px-3 py-1 rounded-lg flex items-center gap-2">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Assigned Function: {assignedJobTitle}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={handleLogout}
                            className="bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-600/30 text-gray-500 hover:text-red-500 font-black px-6 py-3 rounded-2xl uppercase tracking-widest text-[9px] transition-all active:scale-95"
                        >
                            Disconnect Terminal
                        </button>
                        <div className="flex items-center gap-3 bg-black/40 border border-white/5 px-6 py-3 rounded-2xl shadow-inner">
                            <div className="flex flex-col items-end">
                                <p className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em]">Perimeter Integrity</p>
                                <p className="text-[10px] font-bold text-green-500 uppercase">System Nominal</p>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                        </div>
                    </div>
                </div>
                
                <div className="flex overflow-x-auto pb-4 mb-10 gap-2 scrollbar-hide">
                    {Object.entries(ALL_TABS).map(([tabId, label]) => allowedTabs.includes(tabId) && (
                        <button 
                            key={tabId} 
                            onClick={() => setActiveTab(tabId)} 
                            className={`px-8 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-600 hover:text-white'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {activeTab === 'pulse' && <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />}
                    {activeTab === 'mail' && <StudioMail analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'dispatch' && <CommunicationsTerminal movies={movies} />}
                    {activeTab === 'intel' && <UserIntelligenceTab movies={movies} onPrepareRecommendation={() => {}} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'watchParty' && <WatchPartyManager allMovies={movies} onSave={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'jury' && (
                        <div className="space-y-16">
                            <JuryRoomTab pipeline={pipeline} />
                            <AcademyIntelTab pipeline={pipeline} movies={movies} />
                        </div>
                    )}
                    {activeTab === 'payouts' && <AdminPayoutsTab />}
                    {activeTab === 'festHub' && (
                        <div className="space-y-16">
                            <FestivalAnalytics analytics={analytics} festivalData={festivalData} config={festivalConfig} />
                            <FestivalEditor 
                                data={festivalData} 
                                config={festivalConfig || { isFestivalLive: false, title: '', description: '', startDate: '', endDate: '' }} 
                                allMovies={movies}
                                onDataChange={(d) => setFestivalData(d)}
                                onConfigChange={(c) => setFestivalConfig(c)}
                                onSave={() => handleSaveData('festival', { config: festivalConfig, data: festivalData })}
                                isSaving={isSaving}
                            />
                        </div>
                    )}
                    {activeTab === 'crateFestHub' && (
                        <div className="space-y-16">
                            <CrateFestAnalytics analytics={analytics} config={crateFestConfig} />
                            <CrateFestEditor config={crateFestConfig || { isActive: false, title: '', tagline: '', startDate: '', endDate: '', passPrice: 15, movieBlocks: [] }} allMovies={movies} pipeline={pipeline} onSave={(c) => handleSaveData('settings', { crateFestConfig: c })} isSaving={isSaving} />
                        </div>
                    )}
                    {activeTab === 'editorial' && <EditorialManager allMovies={movies} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={() => setActiveTab('movies')} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    {activeTab === 'discovery' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(c) => handleSaveData('categories', c)} />}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'vouchers' && (
                        <PromoCodeManager 
                            isAdmin={true} 
                            targetFilms={Object.values(movies) as Movie[]} 
                            targetBlocks={festivalData.flatMap(d => d.blocks)}
                        />
                    )}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies) as Movie[]} onSave={(c) => handleSaveData('categories', c)} isSaving={isSaving} />}
                    {activeTab === 'laurels' && < LaurelManager allMovies={Object.values(movies) as Movie[]} />}
                    {activeTab === 'roku' && <RokuManagementTab allMovies={Object.values(movies) as Movie[]} onSaveMovie={(m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'rokuForge' && <RokuForge />}
                    {activeTab === 'permissions' && <PermissionsManager allTabs={ALL_TABS} initialPermissions={permissions} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    {activeTab === 'security' && <SecurityTerminal />}
                </div>
            </div>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
