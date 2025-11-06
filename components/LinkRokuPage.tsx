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

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <Header 
                searchQuery="" 
                onSearch={() => {}} 
                isScrolled={true} 
                onMobileSearchClick={() => {}}
                showSearch={false} 
            />
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-lg text-center">
                    <h1 className="text-4xl font-bold mb-4">Link Your Roku Device</h1>
                    <p className="text-gray-400 mb-8">
                        Enter the code displayed on your TV screen to connect your Crate TV account and sync your purchases.
                    </p>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8">
                        {status === 'success' ? (
                            <div>
                                <h2 className="text-2xl font-bold text-green-400 mb-4">Device Linked!</h2>
                                <p className="text-gray-300">{message}</p>
                                <p className="text-gray-300 mt-2">You can now close this page and return to your TV.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <label htmlFor="rokuCode" className="block text-sm font-medium text-gray-400 mb-2">
                                    Roku Link Code
                                </label>
                                <input
                                    type="text"
                                    id="rokuCode"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    className="form-input text-center text-2xl tracking-[.25em] font-mono"
                                    placeholder="ABC-123"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'linking'}
                                    className="submit-btn w-full mt-6"
                                >
                                    {status === 'linking' ? 'Linking...' : 'Link Device'}
                                </button>
                                {status === 'error' && <p className="text-red-400 text-sm mt-4">{message}</p>}
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