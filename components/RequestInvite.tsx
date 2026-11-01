import React, { useState } from 'react';

// "No code? Request an invite": a small form that opens in place. The request lands in
// the dashboard (Studio Mail → Received) so it can be answered with an invite code.
// Used on private screenings. Server side: api/request-invite.ts.
const RequestInvite: React.FC<{ movieKey?: string; movieTitle?: string }> = ({ movieKey, movieTitle }) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [note, setNote] = useState('');
    const [trap, setTrap] = useState('');
    const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setState('sending'); setError('');
        try {
            const res = await fetch('/api/request-invite', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, note, movieKey, movieTitle, company_site: trap }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
            setState('done');
        } catch (err) {
            setError((err as Error).message);
            setState('idle');
        }
    };

    if (state === 'done') {
        return <p className="text-sm text-green-400 font-bold text-center">Thank you. We'll email your invite soon.</p>;
    }
    if (!open) {
        return <button type="button" onClick={() => setOpen(true)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-white underline underline-offset-4">No code? Request an invite</button>;
    }
    const input = 'w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-600';
    return (
        <form onSubmit={submit} className="space-y-3 text-left" aria-label="Request an invite">
            <p className="text-[11px] text-gray-400 text-center">Tell us who you are and we'll send you an invite if there's a seat.</p>
            <input value={name} onChange={e => setName(e.target.value)} required maxLength={100} placeholder="Your name" aria-label="Your name" className={input} />
            <input value={email} onChange={e => setEmail(e.target.value)} required type="email" maxLength={254} placeholder="Your email" aria-label="Your email" className={input} />
            <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Anything you'd like us to know (optional)" aria-label="A note" className={input} />
            {/* Hidden from people; bots fill it. */}
            <input value={trap} onChange={e => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="company_site" />
            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
            <button type="submit" disabled={state === 'sending'} className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-xs py-3 rounded-lg disabled:opacity-50">
                {state === 'sending' ? 'Sending…' : 'Request my invite'}
            </button>
        </form>
    );
};

export default RequestInvite;
