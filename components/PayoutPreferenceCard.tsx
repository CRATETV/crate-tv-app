import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// "How do you want to be paid?" — shown on the filmmaker dashboard.
// Saves to the same record CRATE's Earnings & Payouts page reads, so the
// one-click Pay button there opens the right app with the amount filled in.

const METHODS: { id: string; label: string; placeholder: string; help: string }[] = [
    { id: 'paypal', label: 'PayPal', placeholder: 'paypal.me/yourname', help: 'Your PayPal.Me link or username.' },
    { id: 'cashapp', label: 'Cash App', placeholder: '$yourcashtag', help: 'Your $cashtag.' },
    { id: 'venmo', label: 'Venmo', placeholder: '@your-username', help: 'Your Venmo username.' },
    { id: 'zelle', label: 'Zelle', placeholder: 'email or phone on your Zelle', help: 'The email or US phone number your Zelle is set up with.' },
    { id: 'check', label: 'Check / bank', placeholder: 'Mailing address or notes', help: "We'll contact you to arrange it." },
];

const PayoutPreferenceCard: React.FC = () => {
    const { getUserIdToken } = useAuth();
    const [method, setMethod] = useState('');
    const [handle, setHandle] = useState('');
    const [email, setEmail] = useState('');
    const [state, setState] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const token = await getUserIdToken();
                if (!token) { setState('idle'); return; }
                const res = await fetch('/api/payee-preferences', { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();
                if (res.ok && data.pref) {
                    setMethod(data.pref.method || '');
                    setHandle(data.pref.handle || '');
                    setEmail(data.pref.email || '');
                }
            } catch { /* show the empty form */ }
            setState('idle');
        })();
    }, [getUserIdToken]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setState('saving'); setMessage('');
        try {
            const token = await getUserIdToken();
            const res = await fetch('/api/payee-preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ method, handle, email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not save.');
            setState('saved'); setMessage('Saved. This is how CRATE will send your payouts.');
        } catch (err) {
            setState('error'); setMessage(err instanceof Error ? err.message : 'Could not save.');
        }
    };

    const current = METHODS.find(m => m.id === method);

    return (
        <form onSubmit={save} className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 space-y-5">
            <div>
                <h3 className="text-xl font-black text-white">How do you want to be paid?</h3>
                <p className="text-sm text-gray-400 mt-1">Pick a method so your payouts reach you without any back-and-forth.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {METHODS.map(m => (
                    <button type="button" key={m.id} onClick={() => { setMethod(m.id); setState('idle'); }}
                        className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${method === m.id ? 'bg-white text-black border-white' : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/30'}`}>
                        {m.label}
                    </button>
                ))}
            </div>
            {current && (
                <div className="grid md:grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-xs font-bold text-gray-400">{current.label} details</span>
                        <input value={handle} onChange={e => setHandle(e.target.value)} placeholder={current.placeholder}
                            className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/40 outline-none" />
                        <span className="text-[11px] text-gray-500 mt-1 block">{current.help}</span>
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold text-gray-400">Email for payout receipts</span>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                            className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white/40 outline-none" />
                    </label>
                </div>
            )}
            <div className="flex items-center gap-4">
                <button type="submit" disabled={!method || state === 'saving' || state === 'loading'}
                    className="bg-white text-black font-black px-6 py-3 rounded-xl text-sm disabled:opacity-30">
                    {state === 'saving' ? 'Saving…' : 'Save payout method'}
                </button>
                {message && <p className={`text-sm ${state === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
            </div>
        </form>
    );
};

export default PayoutPreferenceCard;
