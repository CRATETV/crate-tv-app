import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'signup') setIsLoginView(false);
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

    const switchView = (view: 'login' | 'signup') => {
        setIsLoginView(view === 'login');
        setError('');
        setSuccessMessage('');
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">

            {/* ── CINEMATIC BACKGROUND ── */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(239,68,68,0.12)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(127,29,29,0.15)_0%,transparent_60%)]" />
                {/* Film grain */}
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px' }}
                />
            </div>

            {/* ── HEADER ── */}
            <header className="relative z-10 p-6 md:p-10 flex items-center justify-between">
                <button
                    onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new Event('pushstate')); }}
                    className="flex items-center gap-3 group"
                >
                    <img
                        src="https://cratetelevision.s3.us-east-1.amazonaws.com/logo%20with%20background%20removed%20.png"
                        alt="Crate TV"
                        className="h-8 w-auto"
                    />
                </button>
                <button
                    onClick={() => switchView(isLoginView ? 'signup' : 'login')}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                    {isLoginView ? 'New to Crate? ' : 'Already have an account? '}
                    <span className="text-white font-bold underline underline-offset-4 decoration-red-600 decoration-2">
                        {isLoginView ? 'Join free →' : 'Sign in →'}
                    </span>
                </button>
            </header>

            {/* ── MAIN ── */}
            <main className="relative z-10 flex-grow flex items-center justify-center px-4 pb-16">
                <div className="w-full max-w-[420px] animate-[fadeIn_0.5s_ease-out]">
                    
                    {/* Title */}
                    <div className="mb-10 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-red-500 mb-4">
                            {isLoginView ? 'Member Access' : 'Join the Catalog'}
                        </p>
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter italic leading-none text-white">
                            {isLoginView ? 'Welcome\nback.' : 'Start\nwatching.'}
                        </h1>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLoginView && (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Full name"
                                    required
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-600/50 focus:bg-white/[0.06] transition-all"
                                />
                            </div>
                        )}
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-600/50 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 pr-14 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-600/50 focus:bg-white/[0.06] transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-4 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="bg-red-900/20 border border-red-600/30 rounded-xl px-4 py-3 text-red-400 text-sm">
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
                            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl transition-all shadow-[0_8px_30px_rgba(220,38,38,0.3)]"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                    Processing…
                                </span>
                            ) : isLoginView ? 'Sign In' : 'Join Crate — Free'}
                        </button>
                    </form>

                    {/* Footer links */}
                    {isLoginView && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={handlePasswordReset}
                                className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-4"
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    {!isLoginView && (
                        <p className="mt-6 text-center text-[10px] text-gray-700 leading-relaxed">
                            By joining you agree to our{' '}
                            <span className="text-gray-500 underline cursor-pointer">Terms of Service</span>
                            {' '}and{' '}
                            <span className="text-gray-500 underline cursor-pointer">Privacy Policy</span>.
                        </p>
                    )}
                </div>
            </main>

            {/* ── BOTTOM TAGLINE ── */}
            <footer className="relative z-10 pb-8 text-center">
                <p className="text-[9px] uppercase tracking-[0.4em] text-gray-800">
                    The Distribution Afterlife for Independent Cinema
                </p>
            </footer>
        </div>
    );
};

export default LoginPage;
