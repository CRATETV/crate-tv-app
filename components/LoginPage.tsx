import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const { login, user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    // Handle redirect after login
    useEffect(() => {
        if (user) {
            const params = new URLSearchParams(window.location.search);
            const redirectUrl = params.get('redirect') || '/';
            window.history.pushState({}, '', redirectUrl);
            window.dispatchEvent(new Event('pushstate'));
        }
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        // Simulate API call
        setTimeout(() => {
            login(email);
            setIsLoading(false);
            setMessage('Login successful! Redirecting...');
        }, 500);
    };

    const formInputClasses = "form-input";

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-white text-center mb-6">Sign In or Create Account</h1>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={formInputClasses}
                                required
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password (Optional)</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className={`${formInputClasses} text-gray-500`}
                                disabled
                                placeholder="Password not required for demo"
                            />
                        </div>
                        <button type="submit" className="submit-btn w-full" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In / Sign Up'}
                        </button>
                        {message && <p className="text-green-400 text-center mt-4">{message}</p>}
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LoginPage;