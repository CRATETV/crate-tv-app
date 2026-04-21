
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, CrateFestConfig, AnalyticsData } from '../types';
import LoadingSpinner from './LoadingSpinner';
import MovieEditor from './MovieEditor';
import CategoryEditor from './CategoryEditor';
import WatchPartyManager from './WatchPartyManager';
import SecurityTerminal from './SecurityTerminal';
import DailyPulse from './DailyPulse';
import StudioMail from './StudioMail';
import CommunicationsTerminal from './CommunicationsTerminal';
import SaveStatusToast from './SaveStatusToast';
import LaurelManager from './LaurelManager';
import AuditTerminal from './AuditTerminal';
import { MoviePipelineTab } from './MoviePipelineTab';
import CrateFestEditor from './CrateFestEditor';
import FestivalEditor from './FestivalEditor';
import PromoCodeManager from './PromoCodeManager';
import PermissionsManager from './PermissionsManager';
import EditorialManager from './EditorialManager';
import DiscoveryEngine from './DiscoveryEngine';
import JuryRoomTab from './JuryRoomTab';
import AcademyIntelTab from './AcademyIntelTab';
import AdminPayoutsTab from './AdminPayoutsTab';
import PwffAdminTab from './PwffAdminTab';
import UserIntelligenceTab from './UserIntelligenceTab';
import AnalyticsPage from './AnalyticsPage';
import RokuManagementTab from './RokuManagementTab';
import RokuAnalyticsTab from './RokuAnalyticsTab';
import FilmmakerOutreachTab from './FilmmakerOutreachTab';
import TicketCodesTab from './TicketCodesTab';
import MonthlySpotlightTab from './MonthlySpotlightTab';

const ALL_TABS: Record<string, string> = {
    spotlight: '✨ Monthly Spotlight',
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
    ticketCodes: '🎟️ Ticket Codes',
    festHub: '🎪 Festival Hub',
    crateFestHub: '🎟️ Crate Fest Hub',
    vouchers: '🎫 Promo Codes',
    analytics: '📊 Platform Stats',
    categories: '📂 Categories',
    laurels: '🏆 Laurel Forge',
    rokuControl: '📺 Roku Control',
    rokuAnalytics: '📊 Roku Analytics',
    outreach: '🎯 Outreach',
    audit: '📜 Audit Log',
    permissions: '🔑 Permissions',
    security: '🛡️ Security',
    pwff: '🎬 PWFF Festival'
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
    
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [festivalData, setFestivalData] = useState<FestivalDay[]>([]);
    const [festivalConfig, setFestivalConfig] = useState<FestivalConfig | null>(null);
    const [crateFestConfig, setCrateFestConfig] = useState<CrateFestConfig | null>(null);
    const [pwffVisible, setPwffVisible] = useState(false);
    const [pwffDate, setPwffDate] = useState('');
    const [pwffName, setPwffName] = useState('');
    const [pwffDescription, setPwffDescription] = useState('');
    const [pwffTagline, setPwffTagline] = useState('');
    const [pwffYear, setPwffYear] = useState('2026');
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    
    const [activeTab, setActiveTab] = useState('pulse');
    const [tabSearch, setTabSearch] = useState('');
    const [showMoreTools, setShowMoreTools] = useState(false);
    const [spotlightReady, setSpotlightReady] = useState(true); // true = no reminder needed
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const allowedTabs = useMemo(() => {
        const roleLower = role.toLowerCase();
        const isMaster = roleLower === 'super_admin' || 
                         roleLower === 'master' || 
                         roleLower === 'chief_architect' || 
                         roleLower.startsWith('super_admin:') || 
                         roleLower.startsWith('master:') ||
                         role === 'Chief Architect';
        if (isMaster) return Object.keys(ALL_TABS);

        // These tabs are NEVER visible to non-master admins regardless of
        // what is stored in Firestore — hard-coded security boundary
        const MASTER_ONLY = ['permissions', 'security', 'audit', 'payouts', 'rokuControl', 'rokuAnalytics', 'outreach'];

        const specificTabs = permissions[role];
        // Only the pulse dashboard is always visible — everything else must be explicitly granted
        const ALWAYS_VISIBLE = ['pulse'];
        if (specificTabs && specificTabs.length > 0) {
            const merged = [...new Set([...ALWAYS_VISIBLE, ...specificTabs])]
                .filter(tab => !MASTER_ONLY.includes(tab));
            return merged;
        }
        // No permissions assigned yet — show pulse only
        return ALWAYS_VISIBLE;
    }, [role, permissions]);

    const filteredTabs = useMemo(() => {
        const entries = Object.entries(ALL_TABS).filter(([tabId]) => allowedTabs.includes(tabId));
        if (!tabSearch.trim()) return entries;
        const q = tabSearch.toLowerCase();
        return entries.filter(([tabId, label]) =>
            label.toLowerCase().includes(q) || tabId.toLowerCase().includes(q)
        );
    }, [allowedTabs, tabSearch]);

    useEffect(() => {
        if (isAuthenticated && !allowedTabs.includes(activeTab)) {
            setActiveTab(allowedTabs[0] || 'pulse');
        }
    }, [isAuthenticated, allowedTabs]);

    useEffect(() => {
        if (isAuthenticated && activeTab) {
            const name = sessionStorage.getItem('operatorName');
            const pass = sessionStorage.getItem('adminPassword');
            fetch('/api/log-audit-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: pass,
                    operatorName: name,
                    action: 'TAB_ACCESS',
                    type: 'VIEW',
                    details: `Accessed ${ALL_TABS[activeTab] || activeTab} terminal.`
                })
            }).catch(() => {});
        }
    }, [activeTab, isAuthenticated]);

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
                if (data.settings?.pwffProgramVisible !== undefined) setPwffVisible(!!data.settings.pwffProgramVisible);
                if (data.settings?.pwffFestivalDate) setPwffDate(data.settings.pwffFestivalDate);
                if (data.settings?.pwffFestivalName) setPwffName(data.settings.pwffFestivalName);
                if (data.settings?.pwffTeaserDescription) setPwffDescription(data.settings.pwffTeaserDescription);
                if (data.settings?.pwffTeaserTagline) setPwffTagline(data.settings.pwffTeaserTagline);
                if (data.settings?.pwffUrlYear) setPwffYear(data.settings.pwffUrlYear);
            }

            if (pipelineRes.ok) {
                const data = await pipelineRes.json();
                setPipeline(data.pipeline || []);
            }

            // Check if monthly spotlight is set for this month
            try {
                const spotRes = await fetch('/api/set-monthly-spotlight');
                if (spotRes.ok) {
                    const spotData = await spotRes.json();
                    const now = new Date();
                    // Show reminder if no movie set, or if it was sent already this month (needs refreshing for next month)
                    const alreadySentThisMonth = spotData.sentAt && (() => {
                        const sent = spotData.sentAt._seconds
                            ? new Date(spotData.sentAt._seconds * 1000)
                            : new Date(spotData.sentAt);
                        return sent.getMonth() === now.getMonth() && sent.getFullYear() === now.getFullYear();
                    })();
                    setSpotlightReady(!!(spotData.movieKey && !alreadySentThisMonth));
                }
            } catch { /* non-fatal */ }

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
                sessionStorage.setItem('operatorName', loginName || 'ARCHITECT');
                setRole(data.role);
                setAssignedJobTitle(data.jobTitle || '');
                setIsAuthenticated(true);
                fetchAllData(password);
            } else {
                setError('Authentication Failed: Invalid Node Key.');
            }
        } catch (err) {
            setError('Auth Node Unreachable.');
        }
    };

    // Safe tab navigation — silently ignores attempts to navigate to unpermitted tabs
    const navigateTo = (tabId: string) => {
        if (allowedTabs.includes(tabId)) {
            setActiveTab(tabId);
            setTabSearch('');
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

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 selection:text-white">
            <div className="max-w-[1800px] mx-auto p-4 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-white/5 pb-10 gap-6">
                    <div className="flex items-center gap-6">
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
                    </div>
                </div>

                {/* Monthly Spotlight reminder — only shown to admins with spotlight access */}
                {!spotlightReady && allowedTabs.includes('spotlight') && (
                    <div className="mb-6 flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-3.5">
                        <div className="flex items-center gap-3">
                            <span className="text-amber-400 text-lg">✨</span>
                            <div>
                                <p className="text-amber-300 text-xs font-black uppercase tracking-widest">Monthly Spotlight Not Set</p>
                                <p className="text-amber-500/70 text-[11px] mt-0.5">Pick a film for next month's email blast before the first Monday.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigateTo('spotlight')}
                            className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                        >
                            Pick Film →
                        </button>
                    </div>
                )}

                <div className="flex pb-4 mb-10 gap-2 scrollbar-hide flex-col">

                    {/* ── TAB SEARCH ── */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="relative flex-shrink-0">
                            <input
                                type="text"
                                placeholder="Search tabs…"
                                value={tabSearch}
                                onChange={e => setTabSearch(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 w-52 pr-8 transition-colors"
                            />
                            {tabSearch && (
                                <button onClick={() => setTabSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white text-sm">✕</button>
                            )}
                        </div>
                        {tabSearch && filteredTabs.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                {filteredTabs.map(([tabId, label]) => (
                                    <button key={tabId} onClick={() => { navigateTo(tabId); setTabSearch(''); }}
                                        className={`flex-shrink-0 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {tabSearch && filteredTabs.length === 0 && (
                            <p className="text-gray-700 text-[10px] uppercase tracking-widest">No tabs found</p>
                        )}
                    </div>

                    {/* ── DAILY USE ── */}
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 mb-1">Daily</p>
                    <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide flex-wrap">
                    {[['pulse','⚡ Dashboard'],['movies','🎞️ Catalog'],['watchParty','🍿 Watch Party'],['pwff','🎬 PWFF Festival'],['intel','🧠 Users']].filter(([id]) => allowedTabs.includes(id as string)).map(([tabId, label]) => (
                        <button
                            key={tabId}
                            onClick={() => navigateTo(tabId as string)}
                            className={`flex-shrink-0 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-600 hover:text-white'}`}
                        >
                            {label as string}
                        </button>
                    ))}
                    </div>

                    {/* ── FESTIVAL ── */}
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 mb-1 mt-4">Festival</p>
                    <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide flex-wrap">
                    {[['festHub','🎪 Festival Hub'],['pipeline','📥 Submissions'],['analytics','📊 Stats'],['mail','✉️ Send Email']].filter(([id]) => allowedTabs.includes(id as string)).map(([tabId, label]) => (
                        <button
                            key={tabId}
                            onClick={() => navigateTo(tabId as string)}
                            className={`flex-shrink-0 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-600 hover:text-white'}`}
                        >
                            {label as string}
                        </button>
                    ))}
                    </div>

                    {/* ── MORE TOOLS ── */}
                    <div className="mt-4">
                        <button
                            onClick={() => setShowMoreTools(!showMoreTools)}
                            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-gray-400 transition-colors mb-2"
                        >
                            <span>{showMoreTools ? '▾' : '▸'}</span>
                            <span>More Tools</span>
                        </button>
                        {showMoreTools && (
                            <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide flex-wrap">
                            {[['spotlight','✨ Spotlight'],['dispatch','🛰️ Dispatch'],['editorial','✍️ Editorial'],['jury','⚖️ Jury'],['payouts','💰 Payouts'],['ticketCodes','🎟️ Access Codes'],['crateFestHub','🎟️ Crate Fest'],['vouchers','🎫 Promos'],['categories','📂 Categories'],['laurels','🏆 Laurels'],['rokuControl','📺 Roku'],['rokuAnalytics','📊 Roku Analytics'],['outreach','🎯 Outreach'],['audit','📜 Audit Log'],['permissions','🔑 Permissions'],['security','🛡️ Security']].filter(([id]) => allowedTabs.includes(id as string)).map(([tabId, label]) => (
                                <button
                                    key={tabId}
                                    onClick={() => navigateTo(tabId as string)}
                                    className={`flex-shrink-0 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                >
                                    {label as string}
                                </button>
                            ))}
                            </div>
                        )}
                    </div>

                    {/* Hidden original tab renderer — kept for tab search fallback */}
                    <div className="hidden">
                    {filteredTabs.map(([tabId, label]) => (
                        <button
                            key={tabId}
                            onClick={() => navigateTo(tabId)}
                            className={`flex-shrink-0 px-8 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-600 hover:text-white'}`}
                        >
                            {label}
                        </button>
                    ))}
                    {tabSearch && filteredTabs.length === 0 && (
                        <p className="text-gray-700 text-[10px] uppercase tracking-widest py-3.5 px-4">No tabs found</p>
                    )}
                    </div>
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {/* Content-level guard — never renders a tab the current role isn't permitted to see */}
                    {allowedTabs.includes(activeTab) && (<>
                    {activeTab === 'spotlight' && <MonthlySpotlightTab allMovies={movies} />}
                    {activeTab === 'pulse' && (
                        <div>
                            <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />
                        </div>
                    )}
                    {activeTab === 'mail' && <StudioMail analytics={analytics} festivalConfig={crateFestConfig} movies={movies} />}
                    {activeTab === 'dispatch' && <CommunicationsTerminal movies={movies} />}
                    {activeTab === 'intel' && <UserIntelligenceTab movies={movies} onPrepareRecommendation={() => {}} />}
                    {activeTab === 'editorial' && <EditorialManager allMovies={movies} />}
                    {activeTab === 'watchParty' && (
                        <WatchPartyManager 
                            allMovies={movies} 
                            festivalData={festivalData}
                            crateFestConfig={crateFestConfig}
                            onSaveMovie={async (m) => handleSaveData('movies', { [m.key]: m })} 
                            onSaveFestival={async (d) => handleSaveData('festival', { config: festivalConfig, data: d })}
                            onSaveCrateFest={async (c) => handleSaveData('settings', { crateFestConfig: c })}
                        />
                    )}
                    {activeTab === 'discovery' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(c) => handleSaveData('categories', c)} />}
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'pipeline' && <MoviePipelineTab pipeline={pipeline} onCreateMovie={() => navigateTo('movies')} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    {activeTab === 'jury' && (
                        <div className="space-y-16">
                            <JuryRoomTab pipeline={pipeline} />
                            <AcademyIntelTab pipeline={pipeline} movies={movies} />
                        </div>
                    )}
                    {activeTab === 'payouts' && <AdminPayoutsTab />}
                    {activeTab === 'ticketCodes' && (
                        <TicketCodesTab festivalDays={festivalData} />
                    )}
                    {activeTab === 'festHub' && (
                        <div className="space-y-16">
                            <FestivalEditor 
                                data={festivalData} 
                                config={festivalConfig || { isFestivalLive: false, title: '', description: '', startDate: '', endDate: '' }} 
                                allMovies={movies}
                                onDataChange={(d) => setFestivalData(d)}
                                onConfigChange={(c) => setFestivalConfig(c)}
                                onSave={(latestConfig) => handleSaveData('festival', { config: latestConfig, data: festivalData })}
                                isSaving={isSaving}
                            />
                        </div>
                    )}
                    {activeTab === 'crateFestHub' && (
                        <div className="space-y-16">
                            <CrateFestEditor config={crateFestConfig || { isActive: false, title: '', tagline: '', startDate: '', endDate: '', passPrice: 15, movieBlocks: [] }} allMovies={movies} pipeline={pipeline} onSave={(c) => handleSaveData('settings', { crateFestConfig: c })} isSaving={isSaving} />
                        </div>
                    )}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'pwff' && (
                        <PwffAdminTab
                            pwffVisible={pwffVisible}
                            pwffDate={pwffDate}
                            pwffName={pwffName}
                            pwffDescription={pwffDescription}
                            pwffTagline={pwffTagline}
                            pwffYear={pwffYear}
                            pwffBlocks={festivalData.flatMap(d => d.blocks)}
                            onToggleVisible={(val) => { setPwffVisible(val); }}
                            onChangeDate={(val) => { setPwffDate(val); }}
                            onChangeName={(val) => { setPwffName(val); }}
                            onChangeDescription={(val) => { setPwffDescription(val); }}
                            onChangeTagline={(val) => { setPwffTagline(val); }}
                            onChangeYear={(val) => { setPwffYear(val); }}
                            onSave={() => handleSaveData('settings', {
                                pwffProgramVisible: pwffVisible,
                                pwffFestivalDate: pwffDate,
                                pwffFestivalName: pwffName,
                                pwffTeaserDescription: pwffDescription,
                                pwffTeaserTagline: pwffTagline,
                                pwffUrlYear: pwffYear,
                            })}
                            isSaving={isSaving}
                        />
                    )}
                    {activeTab === 'vouchers' && (
                        <PromoCodeManager 
                            isAdmin={true} 
                            targetFilms={Object.values(movies) as Movie[]} 
                            targetBlocks={festivalData.flatMap(d => d.blocks)}
                        />
                    )}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies) as Movie[]} onSave={(c) => handleSaveData('categories', c)} isSaving={isSaving} />}
                    {activeTab === 'laurels' && < LaurelManager allMovies={Object.values(movies) as Movie[]} />}
                    {activeTab === 'rokuControl' && <RokuManagementTab allMovies={Object.values(movies) as Movie[]} onSaveMovie={async (m) => handleSaveData('movies', { [m.key]: m })} />}
                    {activeTab === 'rokuAnalytics' && <RokuAnalyticsTab analytics={analytics} movies={movies} />}
                    {activeTab === 'outreach' && <FilmmakerOutreachTab />}
                    {activeTab === 'audit' && <AuditTerminal />}
                    {activeTab === 'permissions' && <PermissionsManager allTabs={ALL_TABS} initialPermissions={permissions} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    {activeTab === 'security' && <SecurityTerminal />}
                    </>)}
                </div>
            </div>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
