
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { TAB_GROUPS } from './admin/tabMeta';

interface Collaborator {
    id: string;
    name: string;
    jobTitle: string;
    accessKey: string;
    email?: string;
    assignedTabs: string[];
    status: string;
}

// Tabs were consolidated (Sept 2026). Staff grants saved under the old tab
// IDs are shown — and re-saved — under the tab they now live in.
const LEGACY_TAB_MAP: Record<string, string> = {
    hero: 'homepage', heroSpotlight: 'homepage', mail: 'email', dispatch: 'email',
    intel: 'users', accountLookup: 'users', payouts: 'money', revenueFlow: 'money',
    shopRequests: 'shop', shopRevenue: 'shop', rokuControl: 'roku', rokuAnalytics: 'roku',
    audit: 'system', errorLog: 'system', security: 'system', festivalReport: 'pwff', pipeline: 'submissions',
};
const normalizeTabs = (ids: string[] = []) => [...new Set(ids.map(id => LEGACY_TAB_MAP[id] || id))];

interface PermissionsManagerProps {
    allTabs: Record<string, string>;
    initialPermissions: Record<string, string[]>;
    onRefresh: () => void;
}

const PermissionsManager: React.FC<PermissionsManagerProps> = ({ allTabs, initialPermissions, onRefresh }) => {
    const [permissions, setPermissions] = useState(initialPermissions);
    const [newRoleName, setNewRoleName] = useState('');
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isCollabLoading, setIsCollabLoading] = useState(true);
    const [processingRole, setProcessingRole] = useState<string | null>(null);
    const [newCollabName, setNewCollabName] = useState('');
    const [newCollabJob, setNewCollabJob] = useState('');
    const [newCollabEmail, setNewCollabEmail] = useState('');
    const [error, setError] = useState('');

    const fetchCollaborators = async () => {
        const password = sessionStorage.getItem('adminPassword');
        try {
            const res = await fetch('/api/manage-collaborators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, action: 'list' }),
            });
            const data = await res.json();
            setCollaborators(data.collaborators || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsCollabLoading(false);
        }
    };

    useEffect(() => {
        fetchCollaborators();
    }, []);

    const handleCheckboxChange = (role: string, tabId: string) => {
        setPermissions(prev => {
            const currentTabs = prev[role] || [];
            const newTabs = currentTabs.includes(tabId)
                ? currentTabs.filter(t => t !== tabId)
                : [...currentTabs, tabId];
            return { ...prev, [role]: newTabs };
        });
    };

    const handleCollabTabToggle = async (collabId: string, tabId: string) => {
        const collab = collaborators.find(c => c.id === collabId);
        if (!collab) return;

        const currentTabs = normalizeTabs(collab.assignedTabs);
        const nextTabs = currentTabs.includes(tabId)
            ? currentTabs.filter(t => t !== tabId)
            : [...currentTabs, tabId];
        
        // Update local state first
        setCollaborators(prev => prev.map(c => c.id === collabId ? { ...c, assignedTabs: nextTabs } : c));

        // Sync with DB
        const password = sessionStorage.getItem('adminPassword');
        await fetch('/api/manage-collaborators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                password, 
                action: 'update_perms', 
                data: { id: collabId, assignedTabs: nextTabs, jobTitle: collab.jobTitle } 
            }),
        });
        onRefresh();
    };

    const handleUpdateJobTitle = async (collabId: string, jobTitle: string) => {
        const collab = collaborators.find(c => c.id === collabId);
        if (!collab) return;
        
        const password = sessionStorage.getItem('adminPassword');
        await fetch('/api/manage-collaborators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                password, 
                action: 'update_perms', 
                data: { id: collabId, assignedTabs: collab.assignedTabs, jobTitle } 
            }),
        });
        setCollaborators(prev => prev.map(c => c.id === collabId ? { ...c, jobTitle } : c));
    };

    const handleCreateCollab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollabName.trim()) return;
        const password = sessionStorage.getItem('adminPassword');
        await fetch('/api/manage-collaborators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'create', data: { name: newCollabName, jobTitle: newCollabJob, email: newCollabEmail } }),
        }).then(async r => { if (!r.ok) setError((await r.json().catch(() => ({}))).error || 'Could not add staff member.'); });
        setNewCollabName('');
        setNewCollabJob('');
        setNewCollabEmail('');
        fetchCollaborators();
    };

    const handleUpdateEmail = async (collabId: string, email: string) => {
        const collab = collaborators.find(c => c.id === collabId);
        if (!collab || (collab.email || '') === email.trim().toLowerCase()) return;
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        const res = await fetch('/api/manage-collaborators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'set_email', data: { id: collabId, email } }),
        });
        if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Could not save email.'); return; }
        setCollaborators(prev => prev.map(c => c.id === collabId ? { ...c, email: email.trim().toLowerCase() } : c));
    };

    const handleDeleteCollab = async (id: string) => {
        if (!window.confirm("PURGE PROTOCOL: Irreversibly revoke access for this personnel?")) return;
        const password = sessionStorage.getItem('adminPassword');
        await fetch('/api/manage-collaborators', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, action: 'delete', data: { id } }),
        });
        fetchCollaborators();
    };

    const handleSaveRole = async (role: string) => {
        setProcessingRole(role);
        setError('');
        const password = sessionStorage.getItem('adminPassword');
        try {
            const response = await fetch('/api/set-admin-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, role, allowedTabs: permissions[role] }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save permissions.');
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to save ${role}.`);
        } finally {
            setProcessingRole(null);
        }
    };

    const handleAddRole = (e: React.FormEvent) => {
        e.preventDefault();
        const roleKey = newRoleName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!roleKey) {
            setError('Invalid identifier.');
            return;
        }
        if (permissions[roleKey]) {
            setError('Role already exists.');
            return;
        }
        setPermissions(prev => ({ ...prev, [roleKey]: [] }));
        setNewRoleName('');
    };
    
    const assignableTabs = Object.entries(allTabs).filter(([key]) => key !== 'permissions' && key !== 'security' && key !== 'fallback');
    // Tabs grouped the same way as the admin menu, each shown with its full name.
    const assignableIds = new Set(assignableTabs.map(([id]) => id));
    const tabGroups = TAB_GROUPS
        .map(g => ({ title: g.title, tabs: g.ids.filter(id => assignableIds.has(id)).map(id => [id, allTabs[id]] as [string, string]) }))
        .filter(g => g.tabs.length > 0);

    return (
        <div className="space-y-16 animate-[fadeIn_0.5s_ease-out] pb-24">
            {/* Personnel Management Section — only way to manage permissions */}
            <div className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Collaborator Access</h2>
                        <p className="text-gray-500 text-sm mt-1">Add staff and choose which tabs they see. If you add their Crate account email, they sign in at /admin with their own account — no shared key to pass around. Revoking takes effect immediately.</p>
                    </div>
                    
                    <form onSubmit={handleCreateCollab} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            value={newCollabName}
                            onChange={e => setNewCollabName(e.target.value)}
                            placeholder="Personnel Name..."
                            className="form-input !py-3 !px-6 text-xs bg-black/40 border-white/10"
                        />
                        <input
                            type="email"
                            value={newCollabEmail}
                            onChange={e => setNewCollabEmail(e.target.value)}
                            placeholder="Their Crate account email (optional)"
                            className="form-input !py-3 !px-6 text-xs bg-black/40 border-white/10"
                        />
                        <input
                            type="text"
                            value={newCollabJob}
                            onChange={e => setNewCollabJob(e.target.value)}
                            placeholder="Job Title/Function..."
                            className="form-input !py-3 !px-6 text-xs bg-black/40 border-white/10"
                        />
                        <button type="submit" className="bg-red-600 text-white font-black px-6 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">Issue Key</button>
                    </form>
                </div>

                <div className="space-y-5">
                    {isCollabLoading ? (
                        <div className="p-10 text-center"><LoadingSpinner /></div>
                    ) : collaborators.length === 0 ? (
                        <div className="p-10 text-center text-gray-600 font-black uppercase tracking-widest">No Active Personnel</div>
                    ) : collaborators.map(c => {
                        const granted = normalizeTabs(c.assignedTabs).filter(id => assignableIds.has(id));
                        return (
                            <div key={c.id} className="bg-black border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                    <div className="flex items-center gap-3 min-w-[160px]">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-lg font-black text-white uppercase">{c.name}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
                                        <div>
                                            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Job function</p>
                                            <input
                                                type="text"
                                                defaultValue={c.jobTitle}
                                                onBlur={(e) => handleUpdateJobTitle(c.id, e.target.value)}
                                                className="bg-transparent border-b border-white/10 focus:border-indigo-500 text-indigo-400 font-bold outline-none transition-all w-full"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Sign-in email</p>
                                            <input
                                                type="email"
                                                defaultValue={c.email || ''}
                                                placeholder="add Crate email…"
                                                onBlur={(e) => handleUpdateEmail(c.id, e.target.value)}
                                                className="bg-transparent border-b border-white/10 focus:border-indigo-500 text-gray-200 outline-none w-full"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">Backup key</p>
                                            <code className="bg-white/5 px-2 py-1 rounded text-red-500 font-mono text-[11px] select-all">{c.accessKey}</code>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteCollab(c.id)} className="text-[10px] font-black uppercase text-gray-600 hover:text-red-500 transition-colors self-start">Revoke Access</button>
                                </div>

                                <div className="border-t border-white/5 pt-5 space-y-4">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Can open these tabs</p>
                                        <p className="text-[11px] text-gray-500">{granted.length} of {assignableTabs.length} on. Click a tab to turn it on or off.</p>
                                    </div>
                                    {tabGroups.map(g => (
                                        <div key={g.title}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">{g.title}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {g.tabs.map(([tid, tlabel]) => {
                                                    const on = granted.includes(tid);
                                                    return (
                                                        <button
                                                            key={tid}
                                                            onClick={() => handleCollabTabToggle(c.id, tid)}
                                                            aria-pressed={on}
                                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${on ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-200 hover:bg-white/10'}`}
                                                        >
                                                            {on ? '✓ ' : ''}{tlabel}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {error && <p className="text-red-500 text-center font-black uppercase text-[10px] tracking-widest">{error}</p>}
        </div>
    );
};

export default PermissionsManager;
