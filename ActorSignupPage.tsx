import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import PublicS3Uploader from './components/PublicS3Uploader';

const ActorSignupPage: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // State for uploader URLs
    const [photoUrl, setPhotoUrl] = useState('');
    const [highResPhotoUrl, setHighResPhotoUrl] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!photoUrl || !highResPhotoUrl) {
            setError('Please upload both a profile photo and a high-resolution photo.');
            return;
        }

        setStatus('submitting');
        setError('');

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        const submissionData = {
            ...data,
            photoUrl,
            highResPhotoUrl,
        };

        try {
            const response = await fetch('/api/actor-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            const resultData = await response.json();
            if (!response.ok) {
                throw new Error(resultData.error || 'An unknown error occurred.');
            }
            
            setSuccessMessage(resultData.message || 'Success! Your portal is active.');
            setStatus('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process request.');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col min-h-screen bg-[#141414] text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <div className="max-w-2xl bg-gray-800/50 border border-gray-700 rounded-lg p-8 sm:p-12 animate-[fadeIn_0.5s_ease-out]">
                        <h1 className="text-3xl sm:text-4xl font-bold text-green-400 mb-4">Success!</h1>
                        <p className="text-gray-300 mb-6">
                           {successMessage} You can now log in to access the Creator Portal.
                        </p>
                        <a 
                            href="/login?redirect=/portal" 
                            onClick={(e) => {
                                e.preventDefault();
                                window.history.pushState({}, '', '/login?redirect=/portal');
                                window.dispatchEvent(new Event('pushstate'));
                            }}
                            className="submit-btn inline-block"
                        >
                            Go to Login
                        </a>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
             <style>{`
                body {
                    background-image: url('https://cratetelevision.s3.us-east-1.amazonaws.com/actor-bg.jpg');
                    background-size: cover;
                    background-position: center;
                }
            `}</style>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} showNavLinks={false} />
                <main className="flex-grow flex items-center justify-center px-4 pt-24 pb-12">
                     <div className="max-w-xl w-full">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Join the Crate TV Directory</h1>
                            <p className="text-lg text-gray-300">
                               Create your account and public profile to be featured in our Actors Directory and gain access to the Creator Portal.
                            </p>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                    <input type="text" id="name" name="name" className="form-input" required placeholder="Your professional name" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email Address</label>
                                    <input type="email" id="email" name="email" className="form-input" required placeholder="you@example.com" />
                                </div>
                                 <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">Create a Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            id="password"
                                            name="password"
                                            className="form-input"
                                            required
                                            minLength={6}
                                            placeholder="Minimum 6 characters"
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
                                </div>
                                <div>
                                    <label htmlFor="bio" className="block text-sm font-medium text-gray-400 mb-2">Your Biography</label>
                                    <textarea id="bio" name="bio" className="form-input" required rows={4} placeholder="Tell us about yourself..." />
                                </div>
                                <div className="space-y-4">
                                    <PublicS3Uploader label="Upload Profile Photo (Square)" onUploadSuccess={setPhotoUrl} />
                                    <PublicS3Uploader label="Upload High-Res Photo (for Bio Modal)" onUploadSuccess={setHighResPhotoUrl} />
                                </div>
                                 <div>
                                    <label htmlFor="imdbUrl" className="block text-sm font-medium text-gray-400 mb-2">IMDb Profile URL (Optional)</label>
                                    <input type="url" id="imdbUrl" name="imdbUrl" className="form-input" placeholder="https://www.imdb.com/name/nm..." />
                                </div>
                                
                                <button type="submit" className="submit-btn w-full mt-8" disabled={status === 'submitting'}>
                                    {status === 'submitting' ? 'Creating Account...' : 'Create Account & Get Access'}
                                </button>

                                {status === 'error' && (
                                    <p className="mt-4 text-center text-red-400">{error}</p>
                                )}
                            </form>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default ActorSignupPage;