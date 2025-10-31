import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import PublicS3Uploader from './PublicS3Uploader';
import GreenRoomFeed from './GreenRoomFeed';

const ACTOR_PASSWORD = 'cratebio';

const ActorPortalPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    
    // Form state
    const [actorName, setActorName] = useState('');
    const [email, setEmail] = useState('');
    const [bio, setBio] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [highResPhotoUrl, setHighResPhotoUrl] = useState('');
    const [imdbUrl, setImdbUrl] = useState('');
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [formError, setFormError] = useState('');
    const [activeTab, setActiveTab] = useState('update');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ACTOR_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Incorrect password.');
        }
    };
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('submitting');
        setFormError('');
        try {
            const response = await fetch('/api/submit-actor-bio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorName, email, bio, photoUrl, highResPhotoUrl, imdbUrl }),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to submit.');
            setFormStatus('success');
            // Reset form
            setActorName(''); setEmail(''); setBio(''); setPhotoUrl(''); setHighResPhotoUrl(''); setImdbUrl('');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setFormStatus('error');
        }
    };

    if (!isAuthenticated) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                    <h1 className="text-3xl font-bold text-center text-white mb-6">Actor Portal</h1>
                    <form onSubmit={handleLogin}>
                        <div className="relative mb-4">
                             <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
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
                        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
                        <button type="submit" className="submit-btn w-full mt-6">Enter</button>
                    </form>
                </div>
            </div>
        );
    }

    const TabButton: React.FC<{ tabName: string; label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 px-4 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-2">Welcome to the Actor Portal</h1>
                    <p className="text-gray-400 mb-8">Update your profile or connect with other actors in the Green Room.</p>
                    
                     <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
                        <TabButton tabName="update" label="Update My Profile" />
                        <TabButton tabName="feed" label="Green Room Feed" />
                    </div>

                    {activeTab === 'update' && (
                        <div className="bg-gray-800/50 border border-gray-700 p-8 rounded-lg">
                            {formStatus === 'success' ? (
                                <div className="text-center py-10">
                                    <h2 className="text-2xl font-bold text-green-400 mb-4">Submission Received!</h2>
                                    <p className="text-gray-300">Thank you. Our team will review your submission and update your profile shortly.</p>
                                    <button onClick={() => setFormStatus('idle')} className="mt-6 submit-btn">Submit Another Update</button>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="actorName" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                            <input type="text" id="actorName" value={actorName} onChange={e => setActorName(e.target.value)} className="form-input" required placeholder="As it appears in credits" />
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email</label>
                                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" required placeholder="For verification purposes" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-2">New Bio</label>
                                        <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} className="form-input" rows={5} required />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <PublicS3Uploader label="Upload Headshot (small)" onUploadSuccess={setPhotoUrl} />
                                        <PublicS3Uploader label="Upload High-Res Photo" onUploadSuccess={setHighResPhotoUrl} />
                                    </div>
                                    <div>
                                        <label htmlFor="imdbUrl" className="block text-sm font-medium text-gray-400 mb-2">IMDb Profile Link (Optional)</label>
                                        <input type="url" id="imdbUrl" value={imdbUrl} onChange={e => setImdbUrl(e.target.value)} className="form-input" placeholder="https://www.imdb.com/name/nm..." />
                                    </div>
                                    <button type="submit" className="submit-btn w-full mt-8" disabled={formStatus === 'submitting'}>
                                        {formStatus === 'submitting' ? 'Submitting...' : 'Submit Profile for Review'}
                                    </button>
                                    {formStatus === 'error' && <p className="text-red-400 text-center mt-4">{formError}</p>}
                                </form>
                            )}
                        </div>
                    )}
                    {activeTab === 'feed' && actorName && (
                        <GreenRoomFeed actorName={actorName} />
                    )}
                     {activeTab === 'feed' && !actorName && (
                        <p className="text-yellow-400 bg-yellow-900/30 p-4 rounded-md border border-yellow-700">Please enter your name in the "Update My Profile" tab first to access the Green Room.</p>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ActorPortalPage;