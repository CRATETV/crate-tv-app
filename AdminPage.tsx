import React, { useState, useEffect } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import AnalyticsPage from './components/AnalyticsPage';
// Other admin components can be imported here later
// import MovieEditor from './components/MovieEditor';
// import CategoryEditor from './components/CategoryEditor';
// ...

const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('analytics');

    useEffect(() => {
        const storedPassword = sessionStorage.getItem('adminPassword');
        if (storedPassword) {
            setPassword(storedPassword);
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                sessionStorage.setItem('adminPassword', password);
                setIsAuthenticated(true);
            } else {
                const errData = await res.json();
                setError(errData.error || 'Incorrect password.');
            }
        } catch (err) {
            setError('Login request failed. The server might be down.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#141414', color: 'white' }}>
                <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: '#1F2937', borderRadius: '8px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.5rem' }}>Admin Login</h2>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#374151', border: '1px solid #4B5563', borderRadius: '4px', color: 'white' }}
                        />
                        <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#DC2626', color: 'white', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                            Login
                        </button>
                        {error && <p style={{ color: '#EF4444', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
                    </form>
                </div>
            </div>
        );
    }
    
    const renderTabContent = () => {
        switch (activeTab) {
            case 'analytics':
                return <AnalyticsPage />;
            // Add other cases here as components are implemented
            // case 'movies':
            //     return <div>Movie Management</div>;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div style={{ padding: '2rem', backgroundColor: '#141414', color: 'white', minHeight: '100vh' }}>
            <h1 className="no-print" style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Admin Dashboard</h1>
            <div className="no-print" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #374151', marginBottom: '1.5rem' }}>
                 <button onClick={() => setActiveTab('analytics')} style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', color: activeTab === 'analytics' ? '#DC2626' : 'white', borderBottom: activeTab === 'analytics' ? '2px solid #DC2626' : '2px solid transparent', cursor: 'pointer' }}>
                    Analytics
                </button>
                {/* Add more tab buttons here */}
            </div>
            <div>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default AdminPage;