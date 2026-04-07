
import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Collaborator {
    id: string;
    name: string;
    jobTitle: string;
    accessKey: string;
    assignedTabs: string[];
    status: string;
}

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

        const currentTabs = collab.assignedTabs || [];
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
            body: JSON.stringify({ password, action: 'create', data: { name: newCollabName, jobTitle: newCollabJob } }),
        });
        setNewCollabName('');
        setNewCollabJob('');
        fetchCollaborators();
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

    return (
        <div className="space-y-16 animate-[fadeIn_0.5s_ease-out] pb-24">
            {/* Personnel Management Section — only way to manage permissions */}
            <div className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] shadow-2xl space-y-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Collaborator Access</h2>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest italic">Issue and revoke unique personnel keys.</p>
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
                            type="text"
                            value={newCollabJob}
                            onChange={e => setNewCollabJob(e.target.value)}
                            placeholder="Job Title/Function..."
                            className="form-input !py-3 !px-6 text-xs bg-black/40 border-white/10"
                        />
                        <button type="submit" className="bg-red-600 text-white font-black px-6 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">Issue Key</button>
                    </form>
                </div>

                <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 text-gray-500 uppercase font-black">
                                <tr>
                                    <th className="p-5">Name / Identity</th>
                                    <th className="p-5">Job Function</th>
                                    <th className="p-5">Access Token</th>
                                    <th className="p-5">Permitted Sectors</th>
                                    <th className="p-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isCollabLoading ? (
                                    <tr><td colSpan={5} className="p-10 text-center"><LoadingSpinner /></td></tr>
                                ) : collaborators.length === 0 ? (
                                    <tr><td colSpan={5} className="p-10 text-center text-gray-600 font-black uppercase tracking-widest">No Active Personnel</td></tr>
                                ) : collaborators.map(c => (
                                    <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                <span className="text-sm font-black text-white uppercase">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <input 
                                                type="text" 
                                                defaultValue={c.jobTitle} 
                                                onBlur={(e) => handleUpdateJobTitle(c.id, e.target.value)}
                                                className="bg-transparent border-b border-transparent focus:border-indigo-500 text-indigo-400 font-bold outline-none transition-all w-full max-w-[150px]"
                                            />
                                        </td>
                                        <td className="p-5">
                                            <code className="bg-white/5 px-3 py-1.5 rounded-lg text-red-500 font-mono tracking-widest select-all">{c.accessKey}</code>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-wrap gap-1 max-w-md">
                                                {assignableTabs.map(([tid, tlabel]) => (
                                                    <button 
                                                        key={tid}
                                                        onClick={() => handleCollabTabToggle(c.id, tid)}
                                                        className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter transition-all ${c.assignedTabs?.includes(tid) ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-700 hover:text-gray-400'}`}
                                                    >
                                                        {(tlabel as string).split(' ')[1]}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <button onClick={() => handleDeleteCollab(c.id)} className="text-[9px] font-black uppercase text-gray-700 hover:text-red-500 transition-colors">Revoke Access</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {error && <p className="text-red-500 text-center font-black uppercase text-[10px] tracking-widest">{error}</p>}
        </div>
    );
};

export default PermissionsManager;
