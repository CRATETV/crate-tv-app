import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import { Movie, Category } from '../types';
import { fetchAndCacheLiveData } from '../services/dataService';
import Hero from './Hero';

type View = 'signin' | 'signup' | 'forgotpassword';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [view, setView] = useState<View>('signin');
    const { signIn, signUp, user, sendPasswordReset } = useAuth();
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // State for Hero background
    const [isLoading, setIsLoading] = useState(true);
    const [movies, setMovies] = useState<Record<string, Movie>>({});
    const [categories, setCategories] = useState<Record<string, Category>>({});
    const [heroIndex, setHeroIndex] = useState(0);
    const heroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    useEffect(() => {
        if (user) {
            const params = new URLSearchParams(window.location.search);
            const redirectUrl = params.get('redirect') || '/';
            window.history.pushState({}, '', redirectUrl);
            window.dispatchEvent(new Event('pushstate'));
        }
    }, [user]);

    // Effect to load data for Hero background
    useEffect(() => {
        const loadData = async () => {
            try {
            const { data } = await fetchAndCacheLiveData();
            setMovies(data.movies);
            setCategories(data.categories);
            } catch (error) {
            console.error("Failed to load data for login background", error);
            } finally {
            setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const heroMovies = useMemo(() => {
        if (!categories.featured?.movieKeys) return [];
        return categories.featured.movieKeys.map(key => movies[key]).filter(Boolean);
    }, [movies, categories.featured]);

    useEffect(() => {
        if (heroMovies.length > 1) {
            heroIntervalRef.current = setInterval(() => {
                setHeroIndex(prevIndex => (prevIndex + 1) % heroMovies.length);
            }, 7000);
        }
        return () => {
            if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
        };
    }, [heroMovies.length]);

    const handleSetHeroIndex = (index: number) => {
        setHeroIndex(index);
        if (heroIntervalRef.current) clearInterval(heroIntervalRef.current);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (view === 'signup') {
                await signUp(email, password);
            } else if (view === 'signin') {
                await signIn(email, password);
            } else if (view === 'forgotpassword') {
                await sendPasswordReset(email);
                setSuccessMessage('Password reset link sent! Please check your email inbox.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setAuthLoading(false);
        }
    };
    
    const switchView = (newView: View) => {
        setView(newView);
        setError('');
        setSuccessMessage('');
        setPassword('');
    };

    const formInputClasses = "form-input";

    if (isLoading) {
        return <LoadingSpinner />;
    }
    
    // Show a loading spinner if the auth state is still being determined and a user object exists.
    if (!user && authLoading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="relative min-h-screen w-full text-white">
            <div className="absolute inset-0 z-0 h-[56.25vw] max-h-[100vh]">
                <Hero
                    movies={heroMovies}
                    currentIndex={heroIndex}
                    onSetCurrentIndex={handleSetHeroIndex}
                    onSelectMovie={() => {}} // No action on click
                    hideControls={true}
                />
            </div>
            <div className="relative z-10 flex flex-col min-h-screen bg-black/50">
                <Header
                    searchQuery=""
                    onSearch={() => {}}
                    isScrolled={true}
                    onMobileSearchClick={() => {}}
                    showSearch={false}
                />
                
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-black/70 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-8 animate-[fadeIn_0.5s_ease-out]">
                        <h1 className="text-3xl font-bold text-white text-center mb-6">
                            {view === 'signup' ? 'Create an Account' : view === 'forgotpassword' ? 'Reset Password' : 'Sign In'}
                        </h1>
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
                            {view !== 'forgotpassword' && (
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={formInputClasses}
                                        required
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                             {view === 'signin' && (
                                <div className="text-right -mt-4">
                                    <button type="button" onClick={() => switchView('forgotpassword')} className="text-sm text-red-400 hover:underline font-medium">
                                        Forgot Password?
                                    </button>
                                </div>
                            )}
                            
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                            {successMessage && <p className="text-green-400 text-sm text-center">{successMessage}</p>}
                            
                            <button type="submit" className="submit-btn w-full" disabled={authLoading}>
                                {authLoading ? 'Processing...' : (view === 'signup' ? 'Sign Up' : view === 'forgotpassword' ? 'Send Reset Link' : 'Sign In')}
                            </button>
                        </form>
                         {view !== 'forgotpassword' ? (
                            <p className="text-center text-sm text-gray-400 mt-6">
                                {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                                <button onClick={() => switchView(view === 'signup' ? 'signin' : 'signup')} className="font-medium text-red-400 hover:underline ml-2">
                                    {view === 'signup' ? 'Sign In' : 'Sign Up'}
                                </button>
                            </p>
                        ) : (
                             <p className="text-center text-sm text-gray-400 mt-6">
                                Remembered your password?
                                <button onClick={() => switchView('signin')} className="font-medium text-red-400 hover:underline ml-2">
                                    Back to Sign In
                                </button>
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LoginPage;