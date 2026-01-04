
import React, { useState } from 'react';

interface PermissionsManagerProps {
    allTabs: Record<string, string>;
    initialPermissions: Record<string, string[]>;
    onRefresh: () => void;
}

const PermissionsManager: React.FC<PermissionsManagerProps> = ({ allTabs, initialPermissions, onRefresh }) => {
    const [permissions, setPermissions] = useState(initialPermissions);
    const [newRoleName, setNewRoleName] = useState('');
    const [processingRole, setProcessingRole] = useState<string | null>(null);
    const [error, setError] = useState('');

    const handleCheckboxChange = (role: string, tabId: string) => {
        setPermissions(prev => {
            const currentTabs = prev[role] || [];
            const newTabs = currentTabs.includes(tabId)
                ? currentTabs.filter(t => t !== tabId)
                : [...currentTabs, tabId];
            return { ...prev, [role]: newTabs };
        });
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
    
    // Tabs that aren't security critical and can be delegated
    const assignableTabs = Object.entries(allTabs).filter(([key]) => key !== 'permissions' && key !== 'security' && key !== 'fallback');

    return (
        <div className="space-y-10 animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-[#0f0f0f] border border-white/5 p-8 md:p-12 rounded-[2.5rem] shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Access Perimeter</h2>
                        <p className="text-gray-500 text-sm mt-1 uppercase font-bold tracking-widest">Authorized Node Delegation</p>
                    </div>
                    
                    <form onSubmit={handleAddRole} className="flex gap-2">
                        <input
                            type="text"
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value)}
                            placeholder="New Role Key..."
                            className="form-input !py-3 !px-6 text-xs bg-black/40 border-white/10"
                        />
                        <button type="submit" className="bg-white text-black font-black px-6 py-3 rounded-xl uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95">Add Role</button>
                    </form>
                </div>

                <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-2xl mb-12">
                    <p className="text-sm text-indigo-400 font-medium leading-relaxed">
                        To authorize a new node, add an environment variable to Vercel named <code className="bg-indigo-600/20 px-1.5 py-0.5 rounded font-mono">ADMIN_PASSWORD_[ROLE_KEY]</code>. Once the person logs in with that password, they will only see the selected tabs below.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {Object.keys(permissions).map(role => (
                        <div key={role} className="bg-black/40 border border-white/5 p-8 rounded-3xl group">
                            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-widest italic">{role.replace(/_/g, ' ')}</h3>
                                <button 
                                    onClick={() => handleSaveRole(role)}
                                    disabled={processingRole === role}
                                    className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-8 rounded-xl uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20"
                                >
                                    {processingRole === role ? 'Syncing...' : 'Update Permissions'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {assignableTabs.map(([tabId, tabLabel]) => (
                                    <label key={tabId} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${permissions[role]?.includes(tabId) ? 'bg-red-600/5 border-red-500/20 text-white' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={permissions[role]?.includes(tabId)}
                                            onChange={() => handleCheckboxChange(role, tabId)}
                                            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-red-600 focus:ring-red-500"
                                        />
                                        {/* FIX: Casting tabLabel to string to allow .split() operation, as it may be inferred as 'unknown'. */}
                                        <span className="text-[10px] font-black uppercase tracking-widest">{(tabLabel as string).split(' ')[1]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {error && <p className="text-red-500 text-center font-black uppercase text-[10px] tracking-widest">{error}</p>}
        </div>
    );
};

export default PermissionsManager;
