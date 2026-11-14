// "Send to TV": opens this film on the viewer's own linked Roku.
// Shown on the film page to signed-in viewers. The server (api/send-to-tv.ts)
// finds the Roku linked to their account; the Crate TV channel picks it up
// within about 10 seconds while it's open.

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type Status = 'idle' | 'sending' | 'sent' | 'needsLink' | 'error';

// `compact` = the small round button that sits on the player next to Cast. It only appears for
// viewers whose account has a Roku linked (a browser cannot see Rokus on the Wi-Fi, and Rokus do
// not take Chromecast, so "this account has a linked Roku" is the signal we can trust).
const SendToTvButton: React.FC<{ movieKey: string; episode?: number | null; compact?: boolean }> = ({ movieKey, episode = null, compact = false }) => {
    const { user, getUserIdToken } = useAuth();
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    if (!user) return null;
    const hasRoku = !!user.rokuDeviceId;
    if (compact && !hasRoku) return null;

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

    if (compact) {
        const label = status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent to your TV' : status === 'error' || status === 'needsLink' ? 'Could not send' : 'Send to TV';
        return (
            <button
                onClick={(e) => { e.stopPropagation(); send(); }}
                disabled={status === 'sending'}
                title={message || label}
                aria-label="Send to TV"
                className={`flex items-center gap-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white ${status === 'idle' ? 'p-2' : 'py-2 px-3 text-xs font-bold'} ${status === 'sending' ? 'animate-pulse' : ''}`}
            >
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="12" rx="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeWidth={2} d="M8 21h8M12 17v4" />
                </svg>
                {status !== 'idle' && <span>{label}</span>}
            </button>
        );
    }

    // Signed in but no Roku linked yet: point them to the link page instead of a button that cannot work.
    if (!hasRoku) {
        return (
            <p className="mb-3 text-xs text-gray-500 text-center">
                Have a Roku? <a href="/link" className="text-gray-300 underline hover:text-white">Link it</a> to send films to your TV.
            </p>
        );
    }

    return (
        <div className="mb-3">
            <button
                onClick={send}
                disabled={status === 'sending'}
                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-bold py-2 px-4 rounded-lg uppercase tracking-widest text-[10px] active:scale-95 transition-all disabled:opacity-60"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
