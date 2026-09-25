
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Movie, Category, AboutData, FestivalDay, FestivalConfig, MoviePipelineEntry, CrateFestConfig, AnalyticsData, HeroConfig } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
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
import ErrorLogTab from './ErrorLogTab';
import SubmissionsTab from './SubmissionsTab';
import { isNewSubmission } from './MoviePipelineTab';
import ContractsTab from './ContractsTab';
import DiscoveryEngine from './DiscoveryEngine';
import CrateFestEditor from './CrateFestEditor';
import PromoCodeManager from './PromoCodeManager';
import PermissionsManager from './PermissionsManager';
import EditorialManager from './EditorialManager';
import JuryRoomTab from './JuryRoomTab';
import AcademyIntelTab from './AcademyIntelTab';
import AdminPayoutsTab from './AdminPayoutsTab';
import AdminRevenueFlowTab from './AdminRevenueFlowTab';
import AdminShopRequestsTab from './AdminShopRequestsTab';
import AdminShopRevenueTab from './AdminShopRevenueTab';
import PwffAdminTab from './PwffAdminTab';
import UserIntelligenceTab from './UserIntelligenceTab';
import AnalyticsPage from './AnalyticsPage';
import RokuManagementTab from './RokuManagementTab';
import RokuAnalyticsTab from './RokuAnalyticsTab';
import FilmmakerOutreachTab from './FilmmakerOutreachTab';
import FestivalReportTab from './FestivalReportTab';
import TicketCodesTab from './TicketCodesTab';
import MonthlySpotlightTab from './MonthlySpotlightTab';
import HeroEditor from './HeroEditor';
import HeroManager from './HeroManager';
import UserDiagnosticsTab from './UserDiagnosticsTab';

// ─────────────────────────────────────────────────────────────────────────────
// TAB MAP — consolidated Sept 2026.
// 31 tabs (5 of which had no button at all) → 22, grouped by what you're doing.
// Each merged tab renders the old tools stacked inside it, so nothing was lost.
// ─────────────────────────────────────────────────────────────────────────────
const ALL_TABS: Record<string, string> = {
    pulse: '⚡ Dashboard',
    submissions: '📥 Submissions',
    movies: '🎞️ Catalog',
    homepage: '🏠 Homepage',
    watchParty: '🍿 Watch Party',
    pwff: '🎬 PWFF Festival',
    analytics: '📊 Stats',
    users: '🧠 Users',
    email: '✉️ Email',
    spotlight: '✨ Monthly Spotlight',
    editorial: '✍️ Editorial',
    outreach: '🎯 Outreach',
    vouchers: '🎫 Promo Codes',
    ticketCodes: '🎟️ Access Codes',
    jury: '⚖️ Jury',
    crateFestHub: '🎪 Crate Fest (future)',
    categories: '📂 Rows & Categories',
    laurels: '🏆 Laurels',
    money: '💰 Payouts & Revenue',
    contracts: '📄 Contracts',
    discovery: '🔬 Grants & Research',
    shop: '🛍️ Shop',
    roku: '📺 Roku',
    system: '🛡️ Logs & Security',
    permissions: '🔑 Permissions',
};

const TAB_GROUPS: { title: string; ids: string[]; collapsible?: boolean }[] = [
    { title: 'Daily', ids: ['pulse', 'submissions', 'movies', 'homepage', 'watchParty', 'pwff', 'analytics', 'users'] },
    { title: 'Audience & Growth', ids: ['email', 'spotlight', 'editorial', 'outreach', 'vouchers', 'ticketCodes'] },
    { title: 'Festivals & Library', ids: ['jury', 'crateFestHub', 'categories', 'laurels'] },
    { title: 'Business & System', ids: ['money', 'contracts', 'shop', 'discovery', 'roku', 'system', 'permissions'], collapsible: true },
];

// Old tab IDs that may still be saved in Firestore permission grants →
// the tab they now live in. Keeps every existing staff grant working.
const LEGACY_TAB_MAP: Record<string, string> = {
    hero: 'homepage', heroSpotlight: 'homepage',
    mail: 'email', dispatch: 'email',
    intel: 'users', accountLookup: 'users',
    payouts: 'money', revenueFlow: 'money',
    shopRequests: 'shop', shopRevenue: 'shop',
    rokuControl: 'roku', rokuAnalytics: 'roku',
    audit: 'system', errorLog: 'system', security: 'system',
    festivalReport: 'pwff',
    pipeline: 'submissions',
};
const normalizeTabIds = (ids: string[]): string[] =>
    [...new Set(ids.map(id => LEGACY_TAB_MAP[id] || id).filter(id => id in ALL_TABS))];

// Hard-coded security boundary: never visible to non-master admins no matter
// what is stored in Firestore.
const MASTER_ONLY = ['permissions', 'system', 'money', 'contracts', 'roku', 'outreach'];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 mb-4">{children}</h3>
);

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
    const [heroConfig, setHeroConfig] = useState<HeroConfig>({});
    const [pwffVisible, setPwffVisible] = useState(false);
    const [pwffDate, setPwffDate] = useState('');
    const [pwffName, setPwffName] = useState('');
    const [pwffDescription, setPwffDescription] = useState('');
    const [pwffTagline, setPwffTagline] = useState('');
    const [pwffYear, setPwffYear] = useState('2026');
    const [pwffAnnualNumber, setPwffAnnualNumber] = useState('');
    const [pipeline, setPipeline] = useState<MoviePipelineEntry[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    
    const [activeTab, setActiveTab] = useState('pulse');
    const [tabSearch, setTabSearch] = useState('');
    const [showMoreTools, setShowMoreTools] = useState(false);
    const [spotlightReady, setSpotlightReady] = useState(true); // true = no reminder needed
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const isMaster = useMemo(() => {
        const roleLower = role.toLowerCase();
        return roleLower === 'super_admin' ||
               roleLower === 'master' ||
               roleLower === 'chief_architect' ||
               roleLower.startsWith('super_admin:') ||
               roleLower.startsWith('master:') ||
               role === 'Chief Architect';
    }, [role]);

    const allowedTabs = useMemo(() => {
        if (isMaster) return Object.keys(ALL_TABS);
        const specificTabs = normalizeTabIds(permissions[role] || []);
        // Only the dashboard is always visible — everything else must be granted
        return [...new Set(['pulse', ...specificTabs])].filter(tab => !MASTER_ONLY.includes(tab));
    }, [role, permissions, isMaster]);

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

    // `silent` skips the full-page spinner, so refreshing from inside a tab doesn't unmount it.
    const fetchAllData = useCallback(async (adminPassword: string, silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [liveDataRes, pipelineRes, analyticsRes, permsRes] = await Promise.all([
                // POST, not the plain public GET — the GET strips fullMovie/episode URLs for
                // paid titles (see get-live-data.ts), which would otherwise silently break
                // every paid title's admin preview (movie editor, watch-party Control Room).
                // This authenticated equivalent returns the real, unfiltered data.
                fetch('/api/get-live-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword, noCache: true }),
                }),
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
                if (data.settings?.heroConfig) setHeroConfig(data.settings.heroConfig);
                if (data.settings?.pwffProgramVisible !== undefined) setPwffVisible(!!data.settings.pwffProgramVisible);
                if (data.settings?.pwffFestivalDate) setPwffDate(data.settings.pwffFestivalDate);
                if (data.settings?.pwffFestivalName) setPwffName(data.settings.pwffFestivalName);
                if (data.settings?.pwffTeaserDescription) setPwffDescription(data.settings.pwffTeaserDescription);
                if (data.settings?.pwffTeaserTagline) setPwffTagline(data.settings.pwffTeaserTagline);
                if (data.settings?.pwffUrlYear) setPwffYear(data.settings.pwffUrlYear);
                if (data.settings?.pwffAnnualNumber) setPwffAnnualNumber(String(data.settings.pwffAnnualNumber));
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

    // ── Film submissions: "NEW" badge, mark-as-seen, and background check ──
    const newSubmissionCount = useMemo(() => pipeline.filter(isNewSubmission).length, [pipeline]);
    const knownPipelineIds = useRef<Set<string>>(new Set());
    useEffect(() => {
        knownPipelineIds.current = new Set(pipeline.map(p => p.id));
    }, [pipeline]);

    // Reloads only the submissions list (fetchAllData would flash the full-page spinner).
    const refreshPipeline = useCallback(async () => {
        const pass = sessionStorage.getItem('adminPassword');
        if (!pass) return;
        try {
            const res = await fetch('/api/get-pipeline-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass }),
            });
            if (res.ok) {
                const data = await res.json();
                setPipeline(data.pipeline || []);
            }
        } catch { /* non-fatal — the next check will retry */ }
    }, []);

    const markSubmissionViewed = useCallback(async (id: string) => {
        // Optimistic: clear the badge immediately, reconcile with the server if the call fails.
        setPipeline(prev => prev.map(e => e.id === id && !e.viewedAt ? { ...e, viewedAt: { seconds: Math.floor(Date.now() / 1000) } } : e));
        try {
            const res = await fetch('/api/mark-submission-viewed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: sessionStorage.getItem('adminPassword'), submissionId: id }),
            });
            if (!res.ok) refreshPipeline();
        } catch { refreshPipeline(); }
    }, [refreshPipeline]);

    const markAllSubmissionsViewed = useCallback(async () => {
        setPipeline(prev => prev.map(e => isNewSubmission(e) ? { ...e, viewedAt: { seconds: Math.floor(Date.now() / 1000) } } : e));
        try {
            const res = await fetch('/api/mark-submission-viewed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: sessionStorage.getItem('adminPassword'), all: true }),
            });
            if (!res.ok) refreshPipeline();
        } catch { refreshPipeline(); }
    }, [refreshPipeline]);

    // While the admin panel is open, check once a minute for a submission we haven't
    // loaded yet. The check reads a single document (see get-pipeline-data `latestOnly`),
    // and only pulls the full list when something new has actually arrived.
    useEffect(() => {
        if (!isAuthenticated) return;
        const checkForNewSubmissions = async () => {
            if (document.visibilityState !== 'visible') return;
            const pass = sessionStorage.getItem('adminPassword');
            if (!pass) return;
            try {
                const res = await fetch('/api/get-pipeline-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass, latestOnly: true }),
                });
                if (!res.ok) return;
                const { latestId } = await res.json();
                if (latestId && !knownPipelineIds.current.has(latestId)) refreshPipeline();
            } catch { /* non-fatal */ }
        };
        const timer = setInterval(checkForNewSubmissions, 60_000);
        return () => clearInterval(timer);
    }, [isAuthenticated, refreshPipeline]);

    // ── SIGN-IN ─────────────────────────────────────────────────────────
    // The server returns a signed, 12-hour session pass (api/_lib/adminSession.ts).
    // It's stored under the old 'adminPassword' key on purpose, so every
    // existing tab keeps working untouched — but what's stored is the pass,
    // never the real password.
    const { user: crateUser, getUserIdToken } = useAuth();
    const [sessionExpiresAt, setSessionExpiresAt] = useState<number>(0);
    const [isRestoring, setIsRestoring] = useState(() => (sessionStorage.getItem('adminPassword') || '').startsWith('cs1.'));

    const startSession = (data: any) => {
        sessionStorage.setItem('adminPassword', data.sessionToken);
        sessionStorage.setItem('operatorName', data.operatorName || loginName || 'ADMIN');
        sessionStorage.setItem('adminRole', data.role || '');
        sessionStorage.setItem('adminJobTitle', data.jobTitle || '');
        setPassword(''); // don't keep the typed password in memory either
        setRole(data.role);
        setAssignedJobTitle(data.jobTitle || '');
        setSessionExpiresAt(Number(data.expiresAt) || 0);
        setIsAuthenticated(true);
        fetchAllData(data.sessionToken);
    };

    const handleLogin = async (e?: React.FormEvent | null) => {
        e?.preventDefault();
        setError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, name: loginName }),
            });
            const data = await response.json();
            if (data.success && data.sessionToken) startSession(data);
            else setError(response.status === 429 ? 'Too many attempts — wait a few minutes.' : 'Sign-in failed: invalid key.');
        } catch (err) {
            setError('Could not reach the server.');
        }
    };

    const handleAccountLogin = async () => {
        setError('');
        try {
            const idToken = await getUserIdToken();
            if (!idToken) { setError('Sign in to your Crate account first.'); return; }
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            const data = await response.json();
            if (data.success && data.sessionToken) startSession(data);
            else setError(data.error || "This Crate account doesn't have admin access. Ask the owner to add your email in Permissions.");
        } catch {
            setError('Could not reach the server.');
        }
    };

    // Restore a still-valid session after a page reload.
    useEffect(() => {
        const token = sessionStorage.getItem('adminPassword') || '';
        if (!token.startsWith('cs1.')) {
            // Clear any raw password left over from before this update.
            if (token) sessionStorage.removeItem('adminPassword');
            return;
        }
        fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'session', password: token }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    setRole(data.role);
                    setAssignedJobTitle(sessionStorage.getItem('adminJobTitle') || '');
                    setSessionExpiresAt(Number(data.expiresAt) || 0);
                    setIsAuthenticated(true);
                    fetchAllData(token);
                } else {
                    sessionStorage.removeItem('adminPassword');
                }
            })
            .catch(() => {})
            .finally(() => setIsRestoring(false));
    }, []);

    // Sign out automatically when the pass expires, instead of leaving a
    // panel open whose every save quietly fails.
    useEffect(() => {
        if (!isAuthenticated || !sessionExpiresAt) return;
        const ms = sessionExpiresAt - Date.now();
        if (ms <= 0) { handleLogout(); return; }
        const t = setTimeout(() => {
            alert('Your admin session expired (12 hours). Please sign in again.');
            handleLogout();
        }, Math.min(ms, 2 ** 31 - 1));
        return () => clearTimeout(t);
    }, [isAuthenticated, sessionExpiresAt]);

    // Safe tab navigation — silently ignores attempts to navigate to unpermitted tabs
    const navigateTo = (tabId: string) => {
        if (allowedTabs.includes(tabId)) {
            setActiveTab(tabId);
            setTabSearch('');
        }
    };

    function handleLogout() {
        ['adminPassword', 'operatorName', 'adminRole', 'adminJobTitle'].forEach(k => sessionStorage.removeItem(k));
        window.location.reload();
    }

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
            } else {
                // A rejected save (bad auth, validation error, server fault)
                // used to just do nothing here — no message, no indication
                // anything failed. The admin would see their edit "applied"
                // in the local form and have no reason to think it hadn't
                // actually persisted.
                let detail = '';
                try { detail = (await response.json())?.error || ''; } catch {}
                setSaveMessage(`Sync failed (${response.status})${detail ? `: ${detail}` : ''}. Changes were NOT saved — try again.`);
            }
        } catch (err) {
            setSaveMessage("Sync failed. Changes were NOT saved — check your connection and try again.");
        } finally {
            setIsLoading(false);
            setIsSaving(false);
        }
    };

    if (!isAuthenticated && isRestoring) return <LoadingSpinner />;

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-white p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.05)_0%,transparent_70%)] pointer-events-none"></div>
                <div className="relative z-10 w-full max-w-md space-y-12 animate-[fadeIn_0.8s_ease-out]">
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Crate</h2>
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
                        <div className="pt-6 border-t border-white/5 space-y-3">
                            {crateUser?.email ? (
                                <button type="button" onClick={handleAccountLogin} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all">
                                    Continue as {crateUser.email}
                                </button>
                            ) : (
                                <a href="/login?redirect=/admin" className="block text-center w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] transition-all">
                                    Staff: sign in with your Crate account
                                </a>
                            )}
                        </div>
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

                    {TAB_GROUPS.map(group => {
                        const ids = group.ids.filter(id => allowedTabs.includes(id));
                        if (ids.length === 0) return null;
                        const open = !group.collapsible || showMoreTools || ids.includes(activeTab);
                        return (
                            <div key={group.title} className="mt-3">
                                {group.collapsible ? (
                                    <button onClick={() => setShowMoreTools(!showMoreTools)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 hover:text-gray-400 transition-colors mb-2">
                                        <span>{open ? '▾' : '▸'}</span><span>{group.title}</span>
                                    </button>
                                ) : (
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-700 mb-2">{group.title}</p>
                                )}
                                {open && (
                                    <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide flex-wrap">
                                        {ids.map(tabId => (
                                            <button
                                                key={tabId}
                                                onClick={() => navigateTo(tabId)}
                                                className={`relative flex-shrink-0 px-5 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${activeTab === tabId ? 'bg-red-600 border-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                                            >
                                                {ALL_TABS[tabId]}
                                                {tabId === 'submissions' && newSubmissionCount > 0 && (
                                                    <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">{newSubmissionCount}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="animate-[fadeIn_0.4s_ease-out]">
                    {/* Content-level guard — never renders a tab the current role isn't permitted to see */}
                    {allowedTabs.includes(activeTab) && (<>
                    {activeTab === 'homepage' && (
                        <div className="space-y-16">
                            <HeroEditor
                                config={heroConfig}
                                isSaving={isSaving}
                                onSave={async (c) => { setHeroConfig(c); await handleSaveData('settings', { heroConfig: c }); }}
                            />
                            <HeroManager
                                allMovies={Object.values(movies) as Movie[]}
                                featuredKeys={categories.featured?.movieKeys || []}
                                isSaving={isSaving}
                                onSave={(newKeys) => handleSaveData('categories', { featured: { ...(categories.featured || {}), title: categories.featured?.title || 'Featured', movieKeys: newKeys } })}
                            />
                        </div>
                    )}
                    {activeTab === 'spotlight' && <MonthlySpotlightTab allMovies={movies} />}
                    {activeTab === 'pulse' && (
                        <div className="space-y-8">
                            {newSubmissionCount > 0 && allowedTabs.includes('submissions') && (
                                <button onClick={() => navigateTo('submissions')} className="w-full flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-4 text-left hover:bg-amber-500/15 transition-colors">
                                    <span className="text-amber-300 text-xs font-black uppercase tracking-widest">📥 {newSubmissionCount} new film submission{newSubmissionCount === 1 ? '' : 's'} waiting for review</span>
                                    <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Review →</span>
                                </button>
                            )}
                            <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />
                        </div>
                    )}
                    {activeTab === 'email' && (
                        <div className="space-y-16">
                            <section><SectionTitle>Inbox & one-to-one replies</SectionTitle><StudioMail /></section>
                            <section><SectionTitle>Bulk email to your audience</SectionTitle><CommunicationsTerminal movies={movies} /></section>
                        </div>
                    )}
                    {activeTab === 'users' && (
                        <div className="space-y-16">
                            <UserIntelligenceTab movies={movies} />
                            {isMaster && <section><SectionTitle>Account lookup & access diagnostics</SectionTitle><UserDiagnosticsTab /></section>}
                        </div>
                    )}
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
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'submissions' && (
                        <SubmissionsTab
                            pipeline={pipeline}
                            onCreateMovie={() => navigateTo('movies')}
                            onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!, true)}
                            onViewed={markSubmissionViewed}
                            onMarkAllViewed={markAllSubmissionsViewed}
                        />
                    )}
                    {activeTab === 'contracts' && <ContractsTab />}
                    {activeTab === 'discovery' && <DiscoveryEngine analytics={analytics} movies={movies} categories={categories} onUpdateCategories={(c) => handleSaveData('categories', c)} />}
                    {activeTab === 'jury' && (
                        <div className="space-y-16">
                            <JuryRoomTab pipeline={pipeline} />
                            <AcademyIntelTab pipeline={pipeline} movies={movies} />
                        </div>
                    )}
                    {activeTab === 'money' && (
                        <div className="space-y-16">
                            <AdminPayoutsTab />
                            <section><SectionTitle>Where the revenue came from</SectionTitle><AdminRevenueFlowTab /></section>
                        </div>
                    )}
                    {activeTab === 'shop' && (
                        <div className="space-y-16">
                            <AdminShopRequestsTab />
                            {isMaster && <section><SectionTitle>Shop revenue</SectionTitle><AdminShopRevenueTab /></section>}
                        </div>
                    )}
                    {activeTab === 'ticketCodes' && (
                        <TicketCodesTab festivalDays={festivalData} />
                    )}
                    {activeTab === 'crateFestHub' && (
                        <div className="space-y-16">
                            <CrateFestEditor config={crateFestConfig || { isActive: false, title: '', tagline: '', startDate: '', endDate: '', passPrice: 15, movieBlocks: [] }} allMovies={movies} pipeline={pipeline} onSave={(c) => handleSaveData('settings', { crateFestConfig: c })} isSaving={isSaving} />
                        </div>
                    )}
                    {activeTab === 'analytics' && <AnalyticsPage viewMode="full" />}
                    {activeTab === 'pwff' && (
                        <div className="space-y-16">
                        <PwffAdminTab
                            pwffVisible={pwffVisible}
                            pwffDate={pwffDate}
                            pwffName={pwffName}
                            pwffDescription={pwffDescription}
                            pwffTagline={pwffTagline}
                            pwffYear={pwffYear}
                            pwffAnnualNumber={pwffAnnualNumber}
                            pwffBlocks={festivalData.flatMap(d => d.blocks || [])}
                            onToggleVisible={(val) => { setPwffVisible(val); }}
                            onChangeDate={(val) => { setPwffDate(val); }}
                            onChangeName={(val) => { setPwffName(val); }}
                            onChangeDescription={(val) => { setPwffDescription(val); }}
                            onChangeTagline={(val) => { setPwffTagline(val); }}
                            onChangeYear={(val) => { setPwffYear(val); }}
                            onChangeAnnualNumber={(val) => { setPwffAnnualNumber(val); }}
                            onSave={() => handleSaveData('settings', {
                                pwffProgramVisible: pwffVisible,
                                pwffFestivalDate: pwffDate,
                                pwffFestivalName: pwffName,
                                pwffTeaserDescription: pwffDescription,
                                pwffTeaserTagline: pwffTagline,
                                pwffUrlYear: pwffYear,
                                pwffAnnualNumber: Number(pwffAnnualNumber) || null,
                            })}
                            isSaving={isSaving}
                            allMovies={movies}
                            festivalData={festivalData}
                            festivalConfig={festivalConfig || { isFestivalLive: false, title: '', description: '', startDate: '', endDate: '' }}
                            onFestivalDataChange={(d) => setFestivalData(d)}
                            onFestivalConfigChange={(c) => setFestivalConfig(c)}
                            onSaveFestival={(latestConfig) => { handleSaveData('festival', { config: latestConfig, data: festivalData }); }}
                            isSavingFestival={isSaving}
                        />
                        {isMaster && <section><SectionTitle>Festival revenue report</SectionTitle><FestivalReportTab /></section>}
                        </div>
                    )}
                    {activeTab === 'vouchers' && (
                        <PromoCodeManager 
                            isAdmin={true} 
                            targetFilms={Object.values(movies) as Movie[]} 
                            targetBlocks={festivalData.flatMap(d => d.blocks || [])}
                        />
                    )}
                    {activeTab === 'categories' && <CategoryEditor initialCategories={categories} allMovies={Object.values(movies) as Movie[]} onSave={(c) => handleSaveData('categories', c)} isSaving={isSaving} />}
                    {activeTab === 'laurels' && <LaurelManager allMovies={Object.values(movies) as Movie[]} />}
                    {activeTab === 'roku' && (
                        <div className="space-y-16">
                            <RokuManagementTab allMovies={Object.values(movies) as Movie[]} onSaveMovie={async (m) => handleSaveData('movies', { [m.key]: m })} />
                            <section><SectionTitle>Roku analytics</SectionTitle><RokuAnalyticsTab analytics={analytics} movies={movies} /></section>
                        </div>
                    )}
                    {activeTab === 'outreach' && <FilmmakerOutreachTab />}
                    {activeTab === 'system' && (
                        <div className="space-y-16">
                            <section><SectionTitle>Errors from the live site</SectionTitle><ErrorLogTab /></section>
                            <section><SectionTitle>Admin activity (audit log)</SectionTitle><AuditTerminal /></section>
                            <section><SectionTitle>Security monitor</SectionTitle><SecurityTerminal /></section>
                        </div>
                    )}
                    {activeTab === 'permissions' && <PermissionsManager allTabs={Object.fromEntries(Object.entries(ALL_TABS).filter(([id]) => !MASTER_ONLY.includes(id)))} initialPermissions={Object.fromEntries(Object.entries(permissions).map(([r, ids]) => [r, normalizeTabIds(ids)]))} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} />}
                    </>)}
                </div>
            </div>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={false} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
