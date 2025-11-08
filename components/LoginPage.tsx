import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
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
                // The AppRouter will now handle the redirect automatically
                // when the `user` state updates.
            } else {
                await signUp(email, password);
                // After signup, onAuthStateChanged in AuthContext will handle
                // updating the user state, which triggers the AppRouter to show the correct page.
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
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
            setSuccessMessage("Password reset email sent! Please check your inbox and spam folder.");
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-white flex flex-col">
            <header className="absolute top-0 left-0 p-8">
                 <img src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo+with+background+removed+.png" alt="Crate TV" className="w-32 h-auto" />
            </header>
            <main className="flex-grow flex items-center justify-center">
                <div className="w-full max-w-md bg-black/70 backdrop-blur-sm p-8 rounded-lg">
                    <h1 className="text-3xl font-bold mb-6">{isLoginView ? 'Sign In' : 'Sign Up'}</h1>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            required
                            className="form-input"
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="form-input"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        <path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
                        <button type="submit" disabled={isLoading} className="submit-btn w-full">
                            {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Sign Up')}
                        </button>
                    </form>
                    <div className="mt-4 text-center text-gray-400">
                        {isLoginView ? (
                            <>
                                <p>New to Crate TV? <button onClick={() => { setIsLoginView(false); setError(''); }} className="text-white font-bold hover:underline">Sign up now.</button></p>
                                <button onClick={handlePasswordReset} className="text-sm mt-2 hover:underline">Forgot password?</button>
                            </>
                        ) : (
                            <p>Already have an account? <button onClick={() => { setIsLoginView(true); setError(''); }} className="text-white font-bold hover:underline">Sign in.</button></p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;