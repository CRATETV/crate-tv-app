
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
    onClose: () => void;
    initialView: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialView }) => {
    const [isLoginView, setIsLoginView] = useState(initialView === 'login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signIn, signUp, sendPasswordReset } = useAuth();

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);
        try {
            if (isLoginView) {
                await signIn(email, password);
            } else {
                if (!name.trim()) throw new Error("Full name is required.");
                await signUp(email, password, name.trim());
            }
            // On successful login or signup, the AuthProvider handles the state change. We just close the modal.
            onClose();
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
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-[fadeIn_0.3s_ease-out]" 
            onClick={onClose}
        >
            <div 
                className="bg-[#181818] border border-gray-700 rounded-lg shadow-xl w-full max-w-md relative overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-2 text-white">{isLoginView ? 'Sign In' : 'Join for Free'}</h1>
                    {!isLoginView && <p className="text-gray-400 mb-6 text-sm">Create a free account to start watching. Supported by the community.</p>}
                    {isLoginView && <p className="text-gray-400 mb-6 text-sm">Welcome back to Crate TV!</p>}

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
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M2 10s.955-2.263 2.828-4.136A10.046 10.046 0 0110 3c4.478 0 8.268 2.943 9.542 7-.153.483-.32.95-.5 1.401l-1.473-1.473A8.014 8.014 0 0010 8c-2.04 0-3.87.768-5.172 2.035l-1.473-1.473A8.013 8.013 0 002 10z" /></svg>
                                )}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-sm pt-1">{error}</p>}
                        {successMessage && <p className="text-green-500 text-sm pt-1">{successMessage}</p>}
                        <button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-md transition-all transform hover:scale-[1.02] active:scale-95 disabled:bg-gray-600 !mt-6 shadow-lg">
                            {isLoading ? 'Processing...' : (isLoginView ? 'Sign In' : 'Join for Free')}
                        </button>
                    </form>
                    <div className="mt-6 text-center text-gray-400">
                        {isLoginView ? (
                            <>
                                <p>New to Crate TV? <button onClick={() => { setIsLoginView(false); setError(''); }} className="text-white font-bold hover:underline">Join for Free.</button></p>
                                <button onClick={handlePasswordReset} className="text-sm mt-3 hover:underline">Forgot password?</button>
                            </>
                        ) : (
                            <p>Already have an account? <button onClick={() => { setIsLoginView(true); setError(''); }} className="text-white font-bold hover:underline">Sign in.</button></p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
