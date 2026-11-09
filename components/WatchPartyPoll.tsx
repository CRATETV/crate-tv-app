import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { percentages, type PartyPoll } from '../api/_lib/watchPartyPoll';

// The pre-show poll viewers see in the watch-party lobby. The host starts it,
// reveals the results from the Control Room. Rules: api/_lib/watchPartyPoll.ts.

const voteKey = (id: string) => `crate-poll-vote:${id}`;
const readMine = (id: string): number | null => {
    try { const v = localStorage.getItem(voteKey(id)); return v == null ? null : Number(v); } catch { return null; }
};

const WatchPartyPoll: React.FC<{ poll?: PartyPoll | null; movieKey: string; signedIn: boolean }> = ({ poll, movieKey, signedIn }) => {
    const { getUserIdToken } = useAuth();
    const [mine, setMine] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { setMine(poll?.id ? readMine(poll.id) : null); setError(''); }, [poll?.id]);

    if (!poll?.id || !Array.isArray(poll.options)) return null;

    const vote = async (index: number) => {
        if (busy || poll.status !== 'open') return;
        setBusy(true); setError('');
        try {
            const idToken = await getUserIdToken();
            if (!idToken) { setError('Sign in to vote.'); return; }
            const res = await fetch('/api/watch-party-poll', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'vote', movieKey, idToken, option: index }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data.error || 'Your vote did not go through. Try again.'); return; }
            setMine(index);
            try { localStorage.setItem(voteKey(poll.id), String(index)); } catch { /* fine without it */ }
        } catch {
            setError('Your vote did not go through. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    const showing = poll.showResults && Array.isArray(poll.results);
    const pct = showing ? percentages(poll.results!) : [];
    const total = showing ? poll.results!.reduce((s, c) => s + c, 0) : 0;

    return (
        <div className="w-full max-w-md mx-auto rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left animate-[fadeIn_0.5s_ease-out]">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">{showing ? 'The room said' : 'Quick poll while you wait'}</p>
            <p className="text-white font-bold text-lg leading-snug mb-4">{poll.question}</p>

            <div className="space-y-2">
                {poll.options.map((opt, i) => showing ? (
                    <div key={i} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        <div className="absolute inset-y-0 left-0 bg-red-600/40" style={{ width: `${pct[i]}%` }} />
                        <div className="relative flex justify-between gap-3 px-4 py-3 text-sm">
                            <span className="text-white font-semibold">{opt}{mine === i ? '  ✓ you' : ''}</span>
                            <span className="text-white font-black">{pct[i]}%</span>
                        </div>
                    </div>
                ) : (
                    <button
                        key={i}
                        onClick={() => vote(i)}
                        disabled={busy || poll.status !== 'open' || !signedIn}
                        aria-pressed={mine === i}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition-all disabled:opacity-60 ${mine === i ? 'border-red-500 bg-red-600/30 text-white' : 'border-white/10 bg-black/30 text-gray-200 hover:border-white/30'}`}
                    >
                        {mine === i ? '✓ ' : ''}{opt}
                    </button>
                ))}
            </div>

            <p className="text-xs text-gray-500 mt-3">
                {showing ? `${total} vote${total === 1 ? '' : 's'}`
                    : poll.status !== 'open' ? 'Voting is closed. Results are coming up.'
                    : !signedIn ? 'Sign in to vote.'
                    : mine != null ? 'Vote saved. You can change it until voting closes.'
                    : 'Tap an answer. Results show when the film starts.'}
            </p>
            {error && <p className="text-xs text-red-400 mt-2" role="alert">{error}</p>}
        </div>
    );
};

export default WatchPartyPoll;
