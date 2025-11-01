import React, { useState } from 'react';
import Header from './Header';
// FIX: Corrected import path
import Footer from './Footer';

const FilmmakerSignupPage: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('submitting');
        setError('');

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/filmmaker-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An unknown error occurred.');
            }

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
                        <h1 className="text-3xl sm:text-4xl font-bold text-green-400 mb-4">Check Your Email!</h1>
                        <p className="text-gray-300">
                           We've verified your name and sent a secure link to your email. Click the link to create your password and access your personal Filmmaker Dashboard.
                        </p>
                        <p className="text-sm text-yellow-400 mt-4">
                            If you don't see the email within a few minutes, please check your spam folder.
                        </p>
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
                    background-image: url('https://cratetelevision.s3.us-east-1.amazonaws.com/filmmaker-bg.jpg');
                    background-size: cover;
                    background-position: center;
                }
            `}</style>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
                <main className="flex-grow flex items-center justify-center px-4">
                     <div className="max-w-md w-full">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Filmmaker Dashboard</h1>
                            <p className="text-lg text-gray-300">
                               Access your film's performance analytics and manage payouts.
                            </p>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                    <input type="text" id="name" name="name" className="form-input" required placeholder="As it appears in film credits" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email Address</label>
                                    <input type="email" id="email" name="email" className="form-input" required placeholder="Where we'll send your access link" />
                                </div>
                                
                                <button type="submit" className="submit-btn w-full mt-8" disabled={status === 'submitting'}>
                                    {status === 'submitting' ? 'Verifying...' : 'Request Access'}
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

export default FilmmakerSignupPage;