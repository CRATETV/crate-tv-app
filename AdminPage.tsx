import React, { useState, useEffect } from 'react';

// FIX: The original file content was a placeholder. Replaced with a functional Admin Page component to resolve build errors and provide a basic login interface.
const AdminPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check session storage for login status
        if (sessionStorage.getItem('adminLoggedIn') === 'true') {
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    // Store password for other API calls that might need it (like S3 uploader)
                    sessionStorage.setItem('adminPassword', password);
                    setIsLoggedIn(true);
                } else {
                    setError(data.error || 'Login failed');
                }
            } else {
                const data = await response.json();
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminPassword');
        setIsLoggedIn(false);
    };

    if (!isLoggedIn) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
                    <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
                    <div className="mb-4">
                        <label htmlFor="password-input" className="block text-sm font-medium text-gray-400">Password</label>
                        <input
                            id="password-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition">
                        Login
                    </button>
                </form>
            </div>
        );
    }
    
    // Once logged in, show a basic admin panel.
    // In a real app, this would contain components like MovieEditor, FestivalEditor etc.
    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">
                    Logout
                </button>
            </div>
            <p className="mt-4 text-gray-400">Welcome to the admin panel. Content management components would be here.</p>
            {/* Example: A link to return to the main site */}
            <a href="/" className="mt-8 inline-block text-red-400 hover:text-red-300">← Back to Crate TV Home</a>
        </div>
    );
};

export default AdminPage;
