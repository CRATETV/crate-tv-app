import React, { useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import PublicS3Uploader from './PublicS3Uploader';

const ActorSignupPage: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    
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
            const response = await fetch('/api/submit-actor-bio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            const resultData = await response.json();
            if (!response.ok) {
                throw new Error(resultData.error || 'An unknown error occurred.');
            }
            
            setStatus('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process request.');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col min-h-screen text-white">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center text-center p-4">
                    <div className="max-w-2xl bg-gray-800/50 border border-gray-700 rounded-lg p-8 sm:p-12 animate-[fadeIn_0.5s_ease-out]">
                        <h1 className="text-3xl sm:text-4xl font-bold text-green-400 mb-4">Submission Received!</h1>
                        <p className="text-gray-300 mb-6">
                           Thank you for submitting your profile. We'll review it shortly. Once approved, you'll receive an email with instructions on how to create your account and access the Actor Portal.
                        </p>
                        <a 
                            href="/" 
                            onClick={(e) => {
                                e.preventDefault();
                                window.history.pushState({}, '', '/');
                                window.dispatchEvent(new Event('pushstate'));
                            }}
                            className="submit-btn inline-block"
                        >
                            Back to Home
                        </a>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen text-white">
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
                               Submit your profile to be featured in our public Actors Directory and gain access to the Creator Portal upon approval.
                            </p>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="actorName" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                    <input type="text" id="actorName" name="actorName" className="form-input" required placeholder="Your professional name" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email Address</label>
                                    <input type="email" id="email" name="email" className="form-input" required placeholder="you@example.com" />
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
                                    {status === 'submitting' ? 'Submitting...' : 'Submit Profile for Review'}
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