
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

const LoginPage: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signIn, signUp, sendPasswordReset } = useAuth();
    
    // Check for redirect param
    const [redirectPath, setRedirectPath] = useState('/');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        setRedirectPath(redirect || '/');
        if (params.get('view') === 'signup') {
            setIsLoginView(false);
        }
    }, []);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);
        try {
            if (isLoginView) {
                await signIn(email, password);
            } else {
                if (!name.trim()) throw new Error("Please enter your name.");
                await signUp(email, password, name.trim());
            }
        } catch (err: any) {
            if (err.code === 'auth/invalid-credential') {
                setError('Incorrect email or password. Please try again.');
            } else {
                setError(err.message || 'An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePasswordReset = async () => {
        if (!email) {
            setError("Please enter your email address to reset your password.");
            return;
        }
        setError('');
        setSuccessMessage('');
        setIsLoading(true);
        try {
            await sendPasswordReset(email);
            setSuccessMessage("Password reset email sent! Check your inbox.");
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full p-4 bg-black/60 backdrop-blur-xl border border-white/20 rounded-md text-white focus:outline-none focus:border-red-600 transition-all";

    return (
        <div className="min-h-screen text-white flex flex-col bg-black">
            <header className="absolute top-0 left-0 p-8">
                 <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png" alt="Crate TV" className="w-32 h-auto" />
            </header>
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#181818] p-8 rounded-lg shadow-2xl border border-gray-800">
                    <h1 className="text-3xl font-bold mb-6">{isLoginView ? 'Sign In' : 'Join for Free'}</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLoginView && (
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full Name"
                                required
                                className={inputClasses}
                            />
                        )}
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            required
                            className={inputClasses}
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className={`${inputClasses} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" /></svg>
                                )}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {successMessage && <p className="text-green-500 text-sm bg-green-900/30 p-2 rounded border border-green-800">{successMessage}</p>}
                        <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-md transition-all shadow-lg active:scale-95 disabled:bg-gray-600">
                            {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Join for Free')}
                        </button>
                    </form>
                    <div className="mt-6 text-center text-gray-400">
                        {isLoginView ? (
                            <>
                                <p>New to Crate TV? <button onClick={() => { setIsLoginView(false); setError(''); setSuccessMessage(''); }} className="text-white font-bold hover:underline">Join for Free.</button></p>
                                <button onClick={handlePasswordReset} className="text-sm mt-3 hover:underline">Forgot password?</button>
                            </>
                        ) : (
                            <p>Already have an account? <button onClick={() => { setIsLoginView(true); setError(''); setSuccessMessage(''); }} className="text-white font-bold hover:underline">Sign in.</button></p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
