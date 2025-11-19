import React, { useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import { useAuth } from '../contexts/AuthContext';

const LinkRokuPage: React.FC = () => {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'linking' | 'success' | 'error'>('idle');

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            alert("Please login first");
            return;
        }

        setStatus('linking');
        
        try {
            const res = await fetch('/api/link-roku-account', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    uid: user.uid, 
                    rokuLinkCode: code.toUpperCase() 
                })
            });
            
            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (err) {
            console.error("Linking failed:", err);
            setStatus('error'); 
        }
    };

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <Header 
                searchQuery="" 
                onSearch={()=>{}} 
                onMobileSearchClick={()=>{}} 
                showSearch={false}
            />
            
            {/* Back Button */}
            <div className="absolute top-24 left-6 z-10 md:top-20">
                <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Account
                </a>
            </div>

            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-md p-8 bg-gray-900/50 border border-gray-700 rounded-xl text-center backdrop-blur-sm">
                    <h1 className="text-3xl font-bold mb-4">Connect to TV</h1>
                    
                    {status === 'success' ? (
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-green-400 text-xl font-bold animate-pulse">
                                Success!
                            </div>
                            <p className="text-gray-300">Your TV will update automatically.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-400 mb-6">Enter the code displayed on your Roku device.</p>
                            <form onSubmit={handleLink}>
                                <input 
                                    className="w-full bg-black border border-gray-600 rounded-lg p-4 text-center text-4xl font-mono tracking-widest mb-6 uppercase text-white focus:outline-none focus:border-red-600 transition-colors"
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                    placeholder="ABC-123"
                                    maxLength={7}
                                />
                                <button 
                                    type="submit"
                                    disabled={status === 'linking'} 
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 py-3 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-red-900/20 mt-4"
                                >
                                    {status === 'linking' ? 'Connecting...' : 'Link Device'}
                                </button>
                                {status === 'error' && (
                                    <p className="text-red-400 mt-4 text-sm">Invalid code or connection error. Please try again.</p>
                                )}
                            </form>
                        </>
                    )}
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default LinkRokuPage;