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
            setError('Please enter a valid role name (letters, numbers, underscores only).');
            return;
        }
        if (permissions[roleKey]) {
            setError('A role with this name already exists.');
            return;
        }
        setPermissions(prev => ({ ...prev, [roleKey]: [] }));
        setNewRoleName('');
    };
    
    const assignableTabs = Object.entries(allTabs).filter(([key]) => key !== 'permissions' && key !== 'security' && key !== 'fallback');
    const builtInRoles = ['collaborator', 'festival_admin'];

    return (
        <div className="space-y-8">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Role Permissions Manager</h2>
                <p className="text-gray-300 mb-4">
                    Define which tabs each admin role can see. Super Admins and Master Admins see all tabs by default.
                </p>
                <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-300 text-sm rounded-lg p-4">
                    <h3 className="font-bold mb-2">How to Create a New Admin Account:</h3>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Enter a new role name below and click "Add Role".</li>
                        <li>Select the permissions for the new role and click "Save".</li>
                        <li>Add an environment variable to your project named <code className="bg-gray-700 p-1 rounded-md text-xs">ADMIN_PASSWORD_yourrolename</code> with the password.</li>
                        <li>Redeploy the application. The new user can now log in with their password.</li>
                    </ol>
                </div>
            </div>

            <form onSubmit={handleAddRole} className="flex items-center gap-4">
                <input
                    type="text"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="New Role Name (e.g., marketing_manager)"
                    className="form-input"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                    Add Role
                </button>
            </form>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="space-y-6">
                {Object.keys(permissions).concat(builtInRoles.filter(r => !permissions[r])).map(role => (
                    <div key={role} className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white capitalize">{role.replace(/_/g, ' ')}</h3>
                            <button 
                                onClick={() => handleSaveRole(role)}
                                disabled={processingRole === role}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-sm disabled:bg-gray-600"
                            >
                                {processingRole === role ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {assignableTabs.map(([tabId, tabLabel]) => (
                                <label key={tabId} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={(permissions[role] || []).includes(tabId)}
                                        onChange={() => handleCheckboxChange(role, tabId)}
                                        className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-purple-500 focus:ring-purple-500"
                                    />
                                    <span className="text-gray-200">{tabLabel}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PermissionsManager;
