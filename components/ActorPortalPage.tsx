import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import PublicS3Uploader from './PublicS3Uploader';
import LoadingSpinner from './LoadingSpinner';

const ActorPortalPage: React.FC = () => {
    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [actorNameInput, setActorNameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

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

    useEffect(() => {
        const authenticatedActorName = sessionStorage.getItem('authenticatedActorName');
        if (authenticatedActorName) {
            setIsAuthenticated(true);
            setFormState(prev => ({ ...prev, actorName: authenticatedActorName }));
        }
    }, []);
    
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');

        try {
            const response = await fetch('/api/verify-actor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: actorNameInput, password: passwordInput }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed.');
            }

            sessionStorage.setItem('authenticatedActorName', actorNameInput.trim());
            setIsAuthenticated(true);
            setFormState(prev => ({ ...prev, actorName: actorNameInput.trim() }));

        } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setAuthLoading(false);
        }
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
                body: JSON.stringify({ ...formState, password: passwordInput }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit profile.');
            setSubmitStatus('success');
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setSubmitStatus('error');
        }
    };
    
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
                                <input 
                                    type="text" 
                                    id="actorName" 
                                    value={actorNameInput} 
                                    onChange={(e) => setActorNameInput(e.target.value)}
                                    className="form-input" 
                                    required 
                                    autoFocus 
                                    autoComplete="name"
                                />
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
                    {submitStatus === 'success' ? (
                        <div className="text-center py-16 bg-gray-800/50 border border-gray-700 rounded-lg p-8 sm:p-12 animate-[fadeIn_0.5s_ease-out]">
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
                                    <PublicS3Uploader label="Upload Headshot (Small)" onUploadSuccess={(url) => handleUrlUpdate('photoUrl', url)} />
                                    <PublicS3Uploader label="Upload High-Res Photo" onUploadSuccess={(url) => handleUrlUpdate('highResPhotoUrl', url)} />
                                </div>
                                <button type="submit" className="submit-btn w-full mt-8" disabled={submitStatus === 'submitting'}>{submitStatus === 'submitting' ? 'Submitting...' : 'Submit for Review'}</button>
                                {submitStatus === 'error' && <p className="mt-4 text-center text-red-400">{submitError}</p>}
                            </form>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ActorPortalPage;