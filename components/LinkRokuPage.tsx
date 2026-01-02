import React, { useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import { useAuth } from '../contexts/AuthContext';

const LinkRokuPage: React.FC = () => {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'linking' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !user) return;

        setStatus('linking');
        setMessage('');

        try {
            const response = await fetch('/api/link-roku-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: user.uid, rokuLinkCode: code.trim() }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to link account.');
            }
            setStatus('success');
            setMessage('Success! Your Roku device is now linked to your Crate TV account.');

        } catch (err) {
            setStatus('error');
            setMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
    };
    
    const handleNavigate = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleSearch = (query: string) => {
        window.history.pushState({}, '', `/?search=${encodeURIComponent(query)}`);
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleMobileSearch = () => {
        window.history.pushState({}, '', '/?action=search');
        window.dispatchEvent(new Event('pushstate'));
    };


    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            <Header 
                searchQuery="" 
                onSearch={handleSearch} 
                isScrolled={true} 
                onMobileSearchClick={handleMobileSearch}
                showSearch={false} 
            />
             <div className="absolute top-28 left-8 z-10 flex items-center gap-6">
                <a href="/account" onClick={(e) => handleNavigate(e, '/account')} className="text-gray-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Account
                </a>
                <div className="w-px h-4 bg-white/10"></div>
                <a href="/" onClick={(e) => handleNavigate(e, '/')} className="text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.3em]">Home</a>
            </div>
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-lg text-center animate-[fadeIn_0.5s_ease-out]">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter uppercase">Link Roku</h1>
                    <p className="text-gray-400 mb-10 text-lg">
                        Enter the 6-character code displayed on your TV screen to sync your Crate TV profile.
                    </p>

                    <div className="bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
                        {status === 'success' ? (
                            <div className="space-y-6">
                                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Device Active</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
                                <button onClick={(e) => handleNavigate(e, '/')} className="bg-white text-black font-black px-10 py-4 rounded-2xl uppercase tracking-widest text-xs mt-4">Return Home</button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label htmlFor="rokuCode" className="text-[10px] font-black uppercase text-gray-500 tracking-[0.4em] mb-4 block">
                                        Roku Handshake Code
                                    </label>
                                    <input
                                        type="text"
                                        id="rokuCode"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-center text-5xl tracking-[0.5em] font-black text-white focus:outline-none focus:border-red-600 transition-all placeholder:text-gray-800"
                                        placeholder="------"
                                        required
                                        maxLength={7}
                                        minLength={6}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={status === 'linking'}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 disabled:bg-gray-800"
                                >
                                    {status === 'linking' ? 'Authorizing...' : 'Establish Handshake'}
                                </button>
                                {status === 'error' && <p className="text-red-500 text-xs font-black uppercase tracking-widest mt-4">{message}</p>}
                            </form>
                        )}
                    </div>
                </div>
            </main>
            <CollapsibleFooter />
        </div>
    );
};

export default LinkRokuPage;