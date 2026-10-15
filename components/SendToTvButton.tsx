// "Send to TV": opens this film on the viewer's own linked Roku.
// Shown on the film page to signed-in viewers. The server (api/send-to-tv.ts)
// finds the Roku linked to their account; the Crate TV channel picks it up
// within about 10 seconds while it's open.

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Status = 'idle' | 'sending' | 'sent' | 'needsLink' | 'error';

const SendToTvButton: React.FC<{ movieKey: string; episode?: number | null }> = ({ movieKey, episode = null }) => {
    const { user, getUserIdToken } = useAuth();
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    if (!user) return null;

    const send = async () => {
        setStatus('sending');
        setMessage('');
        try {
            const idToken = await getUserIdToken();
            if (!idToken) throw new Error('Please sign in again.');
            const res = await fetch('/api/send-to-tv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, movieKey, episode }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setStatus('sent');
                setMessage('Sent! It opens on your TV in a few seconds (Crate TV needs to be open on your Roku).');
                setTimeout(() => setStatus('idle'), 12000);
                return;
            }
            if (data.needsLink) {
                setStatus('needsLink');
                setMessage('No Roku linked yet. On your TV, open Crate TV → Account → Link your account.');
                return;
            }
            throw new Error(data.error || 'Could not reach your TV.');
        } catch (e: any) {
            setStatus('error');
            setMessage(e.message || 'Could not reach your TV.');
        }
    };

    return (
        <div className="mb-3">
            <button
                onClick={send}
                disabled={status === 'sending'}
                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-60"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="12" rx="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeWidth={2} d="M8 21h8M12 17v4" />
                </svg>
                {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent to your TV' : 'Send to TV'}
            </button>
            {message && (
                <p className={`text-xs mt-2 text-center ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>{message}</p>
            )}
        </div>
    );
};

export default SendToTvButton;
