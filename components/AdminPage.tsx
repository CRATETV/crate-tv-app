
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
import PartnersAdminTab from './PartnersAdminTab';
import CrateFestEditor from './CrateFestEditor';
import PromoCodeManager from './PromoCodeManager';
import PermissionsManager from './PermissionsManager';
import EditorialManager from './EditorialManager';
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
import { PWFF_PARTNER_ID } from '../api/_lib/partnerRules';
import AudienceChoiceAdmin from './AudienceChoiceAdmin';
import AdminSidebar from './admin/AdminSidebar';
import AdminOverview from './admin/AdminOverview';
import type { FilmGroup } from '../api/_lib/filmStatus';
import EarningsPayoutsTab from './admin/EarningsPayoutsTab';
import ContractsCenterTab from './admin/ContractsCenterTab';
import ActorApprovalsTab from './admin/ActorApprovalsTab';
import PaymentsRefundsTab from './admin/PaymentsRefundsTab';
import StorageCleanupTab from './admin/StorageCleanupTab';
import BulkFilmUploadTab from './admin/BulkFilmUploadTab';
import { TAB_META, SELF_HEADED, groupOf } from './admin/tabMeta';
import { ACCENT } from './admin/ui';

// ─────────────────────────────────────────────────────────────────────────────
// TAB MAP — names, icons, groups and descriptions live in admin/tabMeta.ts
// (Oct 2026 refresh). Tab IDs are unchanged so staff permissions keep working.
// ─────────────────────────────────────────────────────────────────────────────
const ALL_TABS: Record<string, string> = Object.fromEntries(Object.entries(TAB_META).map(([id, m]) => [id, m.label]));

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
const MASTER_ONLY = ['permissions', 'system', 'money', 'refunds', 'contracts', 'roku', 'outreach', 'partners', 'storage'];

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
    // PWFF's own days; partner festivals are managed in the Partners tab.
    const pwffDays = useMemo(() => festivalData.filter(d => !d.partnerId), [festivalData]);
    // PWFF run by its committee through the partner portal (Festival in a box).
    const pwffCommitteeDays = useMemo(() => festivalData.filter(d => d.partnerId === PWFF_PARTNER_ID), [festivalData]);
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
    // Which filter chip the Films list opens on (set by the Overview tiles).
    const [filmsFilter, setFilmsFilter] = useState<FilmGroup | 'all'>('all');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [showMoneyTools, setShowMoneyTools] = useState(false);
    // Sidebar badges / Overview "needs attention".
    const [counts, setCounts] = useState({ submissions: 0, actors: 0, payouts: 0, contracts: 0 });
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
        const granted = normalizeTabIds(permissions[role] || []);
        // Actor approvals used to live inside Submissions — keep that access.
        const specificTabs = granted.includes('submissions') ? [...granted, 'actors'] : [...granted];
        // Whoever can edit Films can also bulk-upload them (Oct 2026).
        if (granted.includes('movies')) specificTabs.push('bulkUpload');
        // Only the dashboard is always visible — everything else must be granted
        return [...new Set(['pulse', ...specificTabs])].filter(tab => !MASTER_ONLY.includes(tab));
    }, [role, permissions, isMaster]);

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

    // ── Sidebar badges: actors waiting, payout requests, unsigned agreements ──
    const refreshCounts = useCallback(async () => {
        const pass = sessionStorage.getItem('adminPassword');
        if (!pass) return;
        const post = (url: string, body: Record<string, unknown> = {}) => fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pass, ...body }),
        }).then(r => (r.ok ? r.json() : null)).catch(() => null);
        const [actors, payouts, contracts] = await Promise.all([
            allowedTabs.includes('actors') ? post('/api/get-actor-submissions') : Promise.resolve(null),
            allowedTabs.includes('money') ? post('/api/get-payouts') : Promise.resolve(null),
            allowedTabs.includes('contracts') ? post('/api/contracts', { action: 'admin-list' }) : Promise.resolve(null),
        ]);
        setCounts(c => ({
            ...c,
            actors: actors ? (actors.submissions || []).filter((x: any) => x.status === 'pending').length : c.actors,
            payouts: payouts ? (payouts.payoutRequests || []).filter((x: any) => x.status === 'pending').length : c.payouts,
            contracts: contracts ? (contracts.requests || []).filter((x: any) => x.status === 'sent').length : c.contracts,
        }));
    }, [allowedTabs]);
    useEffect(() => {
        if (!isAuthenticated) return;
        refreshCounts();
        const t = setInterval(() => { if (document.visibilityState === 'visible') refreshCounts(); }, 5 * 60_000);
        return () => clearInterval(t);
    }, [isAuthenticated, refreshCounts]);
    useEffect(() => { if (isAuthenticated) refreshCounts(); }, [activeTab]);

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
            setMobileNavOpen(false);
            window.scrollTo({ top: 0 });
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
                setSaveMessage('Saved.');
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0B0D] text-white p-4 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60% 50% at 30% 20%, rgba(255,59,92,0.18), transparent 70%), radial-gradient(50% 50% at 75% 80%, rgba(123,77,255,0.16), transparent 70%)" }}></div>
                <div className="relative z-10 w-full max-w-md space-y-12 animate-[fadeIn_0.8s_ease-out]">
                    <div className="text-center space-y-4">
                        <span className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{ background: 'linear-gradient(135deg, #FF9A3C, #FF3B5C 35%, #D63BD9 65%, #7B4DFF)' }}>C</span>
                        <h1 className="text-3xl font-black tracking-tight text-white">CRATE Studio</h1>
                        <p className="text-sm text-[#A1A1AD]">Sign in to run CRATE TV.</p>
                    </div>

                    <form onSubmit={handleLogin} className="bg-[#131318]/90 backdrop-blur border border-white/10 p-8 md:p-10 rounded-[2rem] shadow-2xl space-y-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[13px] font-semibold text-[#C9C9D1] ml-1">Admin password</label>
                                <div className="relative group">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="••••••••" 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-lg tracking-widest text-white focus:border-white/40 transition-all outline-none" 
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
                                <label className="text-[13px] font-semibold text-[#C9C9D1] ml-1">Your name</label>
                                <input 
                                    type="text" 
                                    value={loginName} 
                                    onChange={(e) => setLoginName(e.target.value)} 
                                    placeholder="e.g. Salome" 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-base text-white focus:border-white/40 transition-all outline-none" 
                                />
                            </div>
                        </div>
                        {error && <p className="text-[#FF6B85] text-sm font-semibold text-center animate-shake">{error}</p>}
                        <button 
                            className="w-full text-white font-black py-4 rounded-2xl text-base shadow-2xl transition-all transform active:scale-95 hover:brightness-110"
                            style={{ background: 'linear-gradient(90deg, #FF3B5C, #D63BD9)' }}
                            type="submit"
                        >
                            Sign in
                        </button>
                        <div className="pt-6 border-t border-white/5 space-y-3">
                            {crateUser?.email ? (
                                <button type="button" onClick={handleAccountLogin} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 rounded-2xl text-sm transition-all">
                                    Continue as {crateUser.email}
                                </button>
                            ) : (
                                <a href="/login?redirect=/admin" className="block text-center w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold py-3.5 rounded-2xl text-sm transition-all">
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

    const operatorName = sessionStorage.getItem('operatorName') || '';
    const activeMeta = TAB_META[activeTab];
    const activeGroup = groupOf(activeTab);
    const badges: Record<string, number> = { submissions: newSubmissionCount, actors: counts.actors, money: counts.payouts, contracts: counts.contracts };
    const sidebar = (
        <AdminSidebar
            allowedTabs={allowedTabs}
            activeTab={activeTab}
            onNavigate={navigateTo}
            badges={badges}
            operatorName={operatorName}
            jobTitle={assignedJobTitle}
            onLogout={handleLogout}
        />
    );

    return (
        <div className="min-h-screen bg-[#0B0B0D] text-white selection:bg-[#FF3B5C] selection:text-white">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block fixed inset-y-0 left-0 w-72 bg-[#0E0E12] border-r border-white/[0.07] z-40">{sidebar}</aside>

            {/* Mobile top bar + drawer */}
            <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0B0B0D]/90 backdrop-blur border-b border-white/[0.07]">
                <button onClick={() => setMobileNavOpen(true)} className="flex items-center gap-2 text-white font-bold" aria-label="Open menu">
                    <span className="text-xl" aria-hidden>☰</span>
                    <span>{activeMeta?.icon} {activeMeta?.label}</span>
                </button>
                {(newSubmissionCount + counts.actors + counts.payouts + counts.contracts) > 0 && (
                    <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center text-[#0B0B0D]" style={{ background: ACCENT.amber }}>{newSubmissionCount + counts.actors + counts.payouts + counts.contracts}</span>
                )}
            </div>
            {mobileNavOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
                    <div className="w-[85%] max-w-xs h-full bg-[#0E0E12] border-r border-white/10 shadow-2xl">{sidebar}</div>
                    <button className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />
                </div>
            )}

            <main className="lg:pl-72">
                <div className="max-w-[1500px] mx-auto px-4 md:px-8 lg:px-10 py-6 md:py-10">
                {activeMeta && !SELF_HEADED.has(activeTab) && (
                    <div className="mb-8">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] mb-2" style={{ color: activeGroup ? ACCENT[activeGroup.accent] : ACCENT.coral }}>{activeGroup?.title}</p>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3"><span aria-hidden>{activeMeta.icon}</span>{activeMeta.label}</h1>
                        <p className="text-[15px] text-[#A1A1AD] mt-2">{activeMeta.desc}</p>
                    </div>
                )}

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
                        <AdminOverview
                            operatorName={operatorName}
                            isMaster={isMaster}
                            allowedTabs={allowedTabs}
                            counts={{ ...counts, submissions: newSubmissionCount }}
                            spotlightMissing={!spotlightReady}
                            filmCount={Object.keys(movies).length}
                            movies={movies}
                            categories={categories}
                            festivalData={festivalData}
                            onOpenFilms={(g) => { setFilmsFilter(g); navigateTo('movies'); }}
                            onNavigate={navigateTo}
                        >
                            <DailyPulse pipeline={pipeline} analytics={analytics} movies={movies} categories={categories} />
                        </AdminOverview>
                    )}
                    {activeTab === 'actors' && <ActorApprovalsTab onCountChange={(n) => setCounts(c => ({ ...c, actors: n }))} />}
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
                    {activeTab === 'movies' && <MovieEditor allMovies={movies} categories={categories} festivalData={festivalData} initialFilter={filmsFilter} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!)} onSave={(data) => handleSaveData('movies', data)} onDeleteMovie={(key) => handleSaveData('delete_movie', { key })} onSetNowStreaming={(k) => handleSaveData('set_now_streaming', { key: k })} />}
                    {activeTab === 'submissions' && (
                        <SubmissionsTab
                            pipeline={pipeline}
                            onCreateMovie={() => navigateTo('movies')}
                            onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!, true)}
                            onViewed={markSubmissionViewed}
                            onMarkAllViewed={markAllSubmissionsViewed}
                        />
                    )}
                    {activeTab === 'refunds' && <PaymentsRefundsTab />}
                    {activeTab === 'storage' && <StorageCleanupTab />}
                    {activeTab === 'bulkUpload' && <BulkFilmUploadTab movies={movies} onRefresh={() => fetchAllData(sessionStorage.getItem('adminPassword')!, true)} />}
                    {activeTab === 'contracts' && <ContractsCenterTab movies={movies} pipeline={pipeline} categories={categories} />}
                    {activeTab === 'partners' && <PartnersAdminTab allMovies={movies} />}
                    {activeTab === 'money' && (
                        <div className="space-y-10">
                            <EarningsPayoutsTab onOpenTab={navigateTo} />
                            <section className="rounded-3xl border border-white/[0.07] bg-[#131318]">
                                <button onClick={() => setShowMoneyTools(v => !v)} className="w-full flex items-center justify-between px-6 py-5 text-left">
                                    <span><span className="block text-white font-bold">More tools</span><span className="block text-sm text-[#8A8A96]">Payout requests with decline option, payout keys, and festival revenue flow.</span></span>
                                    <span className="text-[#A1A1AD]">{showMoneyTools ? '▾' : '▸'}</span>
                                </button>
                                {showMoneyTools && (
                                    <div className="px-6 pb-6 space-y-16">
                                        <AdminPayoutsTab />
                                        <section><SectionTitle>Where festival revenue came from</SectionTitle><AdminRevenueFlowTab /></section>
                                    </div>
                                )}
                            </section>
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
                        {pwffCommitteeDays.length > 0 && (
                            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm text-emerald-100">
                                <p className="font-bold text-emerald-300">PWFF's lineup is now run by the committee.</p>
                                <p className="mt-1">The PWFF page shows the lineup approved in <strong>🤝 Partner Festivals → PWFF</strong> ({pwffCommitteeDays.reduce((n, d) => n + (d.blocks?.length || 0), 0)} blocks). The schedule editor below no longer appears on the PWFF page; use it only for anything outside the committee's lineup. The page title, dates and "Live" switch are still set here, and the all-access pass price where you set it today.</p>
                            </div>
                        )}
                        <PwffAdminTab
                            pwffVisible={pwffVisible}
                            pwffDate={pwffDate}
                            pwffName={pwffName}
                            pwffDescription={pwffDescription}
                            pwffTagline={pwffTagline}
                            pwffYear={pwffYear}
                            pwffAnnualNumber={pwffAnnualNumber}
                            pwffBlocks={(pwffCommitteeDays.length ? pwffCommitteeDays : pwffDays).flatMap(d => d.blocks || [])}
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
                            festivalData={pwffDays}
                            festivalConfig={festivalConfig || { isFestivalLive: false, title: '', description: '', startDate: '', endDate: '' }}
                            onFestivalDataChange={(d) => setFestivalData([...d, ...festivalData.filter(day => day.partnerId)])}
                            onFestivalConfigChange={(c) => setFestivalConfig(c)}
                            onSaveFestival={(latestConfig) => { handleSaveData('festival', { config: latestConfig, data: pwffDays }); }}
                            isSavingFestival={isSaving}
                        />
                        {isMaster && <section><SectionTitle>Festival revenue report</SectionTitle><FestivalReportTab /></section>}
                        {isMaster && <section><SectionTitle>🏆 Audience Choice</SectionTitle><AudienceChoiceAdmin /></section>}
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
            </main>
            {saveMessage && <SaveStatusToast message={saveMessage} isError={/fail|not saved/i.test(saveMessage)} onClose={() => setSaveMessage('')} />}
        </div>
    );
};

export default AdminPage;
