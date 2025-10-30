import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import PublicS3Uploader from './PublicS3Uploader';
import { fetchAndCacheLiveData } from '../services/dataService';
import { Movie } from '../types';
import LoadingSpinner from './LoadingSpinner';
import GreenRoomFeed from './GreenRoomFeed';

const ACTOR_PASSWORD = 'cratebio'; // Shared password for all actors

type PortalTab = 'profile' | 'greenroom';

const ActorPortalPage: React.FC = () => {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [actorNameInput, setActorNameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Data state
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [allMovies, setAllMovies] = useState<Record<string, Movie>>({});

    // Form submission state
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState('');
    const [formState, setFormState] = useState({
        actorName: '',
        email: '',
        bio: '',
        photoUrl: '',
        highResPhotoUrl: '',
        imdbUrl: ''
    });

    // Tab State
    const [activeTab, setActiveTab] = useState<PortalTab>('profile');

    useEffect(() => {
        const authenticatedActorName = sessionStorage.getItem('authenticatedActorName');
        if (authenticatedActorName) {
            setIsAuthenticated(true);
            setFormState(prev => ({ ...prev, actorName: authenticatedActorName }));
        }
    }, []);

    useEffect(() => {
        const loadMovieData = async () => {
            try {
                const { data } = await fetchAndCacheLiveData();
                setAllMovies(data.movies);
            } catch (e) {
                setAuthError("Could not connect to server to verify actor data. Please try again later.");
            } finally {
                setIsLoadingData(false);
            }
        };
        loadMovieData();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        if (passwordInput !== ACTOR_PASSWORD) {
            setAuthError('Incorrect password.');
            setAuthLoading(false);
            return;
        }

        const trimmedName = actorNameInput.trim().toLowerCase();
        if (!trimmedName) {
            setAuthError('Please enter your full name.');
            setAuthLoading(false);
            return;
        }
        
        const actorFound = Object.values(allMovies).some(movie => 
            (movie as Movie).cast.some(actor => actor.name.trim().toLowerCase() === trimmedName)
        );

        if (actorFound) {
            sessionStorage.setItem('authenticatedActorName', actorNameInput.trim());
            setIsAuthenticated(true);
            setFormState(prev => ({ ...prev, actorName: actorNameInput.trim() }));
        } else {
            setAuthError('Actor name not found in our records. Please ensure it matches film credits exactly.');
        }
        setAuthLoading(false);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('authenticatedActorName');
        setIsAuthenticated(false);
        setActorNameInput('');
        setPasswordInput('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUrlUpdate = (field: keyof typeof formState, url: string) => {
        setFormState(prev => ({ ...prev, [field]: url }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitStatus('submitting');
        setSubmitError('');
        
        if (!formState.actorName || !formState.email || !formState.bio || !formState.photoUrl || !formState.highResPhotoUrl) {
            setSubmitError('Please fill out all required fields and upload both photos.');
            setSubmitStatus('error');
            return;
        }

        try {
            const response = await fetch('/api/submit-actor-bio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit profile.');
            setSubmitStatus('success');
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setSubmitStatus('error');
        }
    };
    
    // RENDER LOGIC
    if (isLoadingData) return <LoadingSpinner />;

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-gray-900 p-8 rounded-lg shadow-lg border border-gray-700">
                        <h1 className="text-2xl font-bold mb-4 text-center text-white">Actor Portal Login</h1>
                        <p className="text-center text-sm text-gray-400 mb-6">Enter your name and the provided password to access the portal.</p>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label htmlFor="actorName" className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                                <input type="text" id="actorName" value={actorNameInput} onChange={(e) => setActorNameInput(e.target.value)} className="form-input" required autoFocus />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                                <input type="password" id="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="form-input" required />
                            </div>
                            {authError && <p className="text-sm text-red-400 text-center">{authError}</p>}
                            <button type="submit" className="submit-btn w-full !mt-6" disabled={authLoading}>{authLoading ? 'Verifying...' : 'Access Portal'}</button>
                        </form>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-white">Actor Portal</h1>
                        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">Sign Out</button>
                    </div>
                    
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-700 mb-8">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
                            >
                                My Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('greenroom')}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'greenroom' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}
                            >
                                The Green Room
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'profile' && (
                        <div className="animate-[fadeIn_0.5s_ease-out]">
                            {submitStatus === 'success' ? (
                                <div className="text-center py-16 bg-gray-800/50 border border-gray-700 rounded-lg p-8 sm:p-12">
                                    <h1 className="text-3xl sm:text-4xl font-bold text-green-400 mb-4">Submission Received!</h1>
                                    <p className="text-gray-300">Thank you for updating your profile. Our team will review your submission shortly.</p>
                                </div>
                            ) : (
                                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <h2 className="text-3xl font-bold text-white mb-4">Update Your Profile</h2>
                                        <div>
                                            <label htmlFor="actorName" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                            <input type="text" id="actorName" name="actorName" value={formState.actorName} className="form-input bg-gray-700" readOnly />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email Address</label>
                                            <input type="email" id="email" name="email" onChange={handleChange} className="form-input" required />
                                        </div>
                                        <div>
                                            <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-2">Your Biography</label>
                                            <textarea id="bio" name="bio" rows={5} onChange={handleChange} className="form-input" required></textarea>
                                        </div>
                                        <div>
                                            <label htmlFor="imdbUrl" className="block text-sm font-medium text-gray-400 mb-2">IMDb Profile Link (Optional)</label>
                                            <input type="url" id="imdbUrl" name="imdbUrl" onChange={handleChange} className="form-input" placeholder="https://www.imdb.com/name/nm..." />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <PublicS3Uploader label="Upload Headshot (for cards & lists)" onUploadSuccess={(url) => handleUrlUpdate('photoUrl', url)} />
                                            </div>
                                            <div>
                                                <PublicS3Uploader label="Upload High-Resolution Photo (for bio page)" onUploadSuccess={(url) => handleUrlUpdate('highResPhotoUrl', url)} />
                                            </div>
                                        </div>
                                        <button type="submit" className="submit-btn w-full !mt-8" disabled={submitStatus === 'submitting'}>
                                            {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Profile for Review'}
                                        </button>
                                        {submitStatus === 'error' && <p className="text-red-400 text-sm mt-2 text-center">{submitError}</p>}
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'greenroom' && (
                        <div className="animate-[fadeIn_0.5s_ease-out]">
                            <GreenRoomFeed actorName={formState.actorName} />
                        </div>
                    )}

                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ActorPortalPage;
