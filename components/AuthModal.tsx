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
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setSuccessMessage(''); setIsLoading(true);
        try {
            if (isLoginView) {
                await signIn(email, password);
            } else {
                if (!name.trim()) throw new Error("Full name is required.");
                await signUp(email, password, name.trim());
            }
            onClose();
        } catch (err: any) {
            setError(err.code === 'auth/invalid-credential'
                ? 'Incorrect email or password.'
                : err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) { setError("Enter your email address first."); return; }
        setError(''); setIsLoading(true);
        try {
            await sendPasswordReset(email);
            setSuccessMessage("Reset email sent — check your inbox.");
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email.');
        } finally {
            setIsLoading(false);
        }
    };

    const switchView = (v: 'login' | 'signup') => {
        setIsLoginView(v === 'login');
        setError(''); setSuccessMessage('');
    };

    const inputBase = "w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-red-600/50 focus:bg-white/[0.06] transition-all";

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md animate-[scaleIn_0.25s_cubic-bezier(0.34,1.56,0.64,1)]"
                onClick={e => e.stopPropagation()}
            >
                {/* Red glow */}
                <div className="absolute -inset-1 bg-gradient-to-br from-red-600/20 via-transparent to-transparent rounded-[2rem] blur-xl pointer-events-none" />

                <div className="relative bg-[#0d0d0d] border border-white/8 rounded-[1.75rem] overflow-hidden">
                    {/* Top accent */}
                    <div className="h-px bg-gradient-to-r from-transparent via-red-600/60 to-transparent" />

                    <div className="p-8 md:p-10">
                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Header */}
                        <div className="mb-8">
                            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-red-500 mb-3">
                                {isLoginView ? 'Member Access' : 'Free Account'}
                            </p>
                            <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white leading-none">
                                {isLoginView ? 'Sign in.' : 'Join Crate.'}
                            </h2>
                            <p className="text-gray-600 text-sm mt-2">
                                {isLoginView ? 'Welcome back to the catalog.' : 'Unlimited independent cinema. Free to watch.'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {!isLoginView && (
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Full name"
                                    required
                                    className={inputBase}
                                    autoComplete="name"
                                />
                            )}
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className={inputBase}
                                autoComplete="email"
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                    className={`${inputBase} pr-14`}
                                    autoComplete={isLoginView ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-4 flex items-center text-gray-700 hover:text-gray-400 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    )}
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-950/40 border border-red-600/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            {successMessage && (
                                <div className="bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-40 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl transition-all shadow-[0_8px_30px_rgba(220,38,38,0.3)] mt-2"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                        Processing…
                                    </span>
                                ) : isLoginView ? 'Sign In' : 'Create Free Account'}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-6 space-y-3 text-center">
                            {isLoginView ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-600">
                                        New to Crate?{' '}
                                        <button onClick={() => switchView('signup')} className="text-white font-bold hover:text-red-400 transition-colors">
                                            Join free →
                                        </button>
                                    </p>
                                    <button onClick={handlePasswordReset} className="text-xs text-gray-700 hover:text-gray-500 transition-colors underline underline-offset-4">
                                        Forgot password?
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Already a member?{' '}
                                    <button onClick={() => switchView('login')} className="text-white font-bold hover:text-red-400 transition-colors">
                                        Sign in →
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
