import React, { useState } from 'react';

const ActorSignupPage: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setStatus('submitting');
        setMessage('');

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/actor-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || 'A server error occurred.');
                } catch (jsonError) {
                    throw new Error(errorText || `Request failed with status ${response.status}.`);
                }
            }
            
            setStatus('success');
            setMessage("Success! We've sent an access link to your email. Please check your inbox and spam folder.");

        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };
    
    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#141414] text-white items-center justify-center p-4">
            
            <div className="absolute top-6 left-6 z-10">
                <a href="/" onClick={(e) => handleNavigate(e, '/')} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Home
                </a>
            </div>
            
            <div className="w-full max-w-md bg-gray-900 p-8 rounded-lg shadow-lg border border-gray-700">
                <h1 className="text-2xl font-bold mb-4 text-center text-white">Actor Portal Signup</h1>
                
                {status === 'success' ? (
                     <div className="text-center py-4">
                        <h2 className="text-xl font-bold text-green-400 mb-2">Check Your Email!</h2>
                        <p className="text-gray-300">{message}</p>
                    </div>
                ) : (
                    <>
                        <p className="text-center text-sm text-gray-400 mb-6">
                           Enter your name and email. We'll verify you're in our film credits and send you the password to access the portal.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Your Full Name</label>
                                <input type="text" id="name" name="name" className="form-input" required placeholder="As it appears in film credits" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Your Email Address</label>
                                <input type="email" id="email" name="email" className="form-input" required placeholder="Where we can send your password" />
                            </div>
                            
                            <button type="submit" className="submit-btn w-full mt-8" disabled={status === 'submitting'}>
                                {status === 'submitting' ? 'Verifying...' : 'Request Access'}
                            </button>

                            {status === 'error' && (
                                <p className="mt-4 text-center text-red-400">{message}</p>
                            )}
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ActorSignupPage;