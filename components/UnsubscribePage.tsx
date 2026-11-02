import React, { useEffect, useState } from 'react';

// Public unsubscribe landing page — linked from the footer of every bulk
// dispatch and the monthly spotlight email (/api/send-bulk-email.ts,
// /api/cron-monthly-spotlight.ts). No sign-in required: clicking the link in
// an email you received is proof enough you have access to that inbox.
//
// The link can carry ?email= to prefill the field (convenience only, not a
// security token — see api/unsubscribe-newsletter.ts for why that's fine).
const UnsubscribePage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fromLink = params.get('email');
        if (fromLink) setEmail(fromLink);
    }, []);

    const handleGoHome = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('pushstate'));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('working');
        setError('');
        try {
            const res = await fetch('/api/unsubscribe-newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Could not process that right now.');
            setStatus('done');
        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white px-6">
            <div className="w-full max-w-sm text-center">
                <button onClick={handleGoHome} className="inline-block mb-10 opacity-70 hover:opacity-100 transition-opacity">
                    <img src="/logo-mark.svg" alt="Crate TV" className="w-16 mx-auto" />
                </button>

                {status === 'done' ? (
                    <>
                        <h1 className="text-2xl font-black mb-3">You're unsubscribed</h1>
                        <p className="text-gray-400 text-sm">
                            {email.trim() || 'That address'} won't get any more Crate TV newsletter emails. You can resubscribe any time from the Zine page.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-black mb-3">Unsubscribe from the newsletter</h1>
                        <p className="text-gray-400 text-sm mb-8">
                            Enter the email address you'd like removed from Crate TV's newsletter list.
                        </p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@email.com"
                                className="form-input text-center"
                            />
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <button
                                type="submit"
                                disabled={status === 'working'}
                                className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3 rounded-full transition-colors disabled:opacity-50"
                            >
                                {status === 'working' ? 'Working…' : 'Unsubscribe'}
                            </button>
                        </form>
                    </>
                )}

                <button onClick={handleGoHome} className="block mx-auto mt-10 text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest">
                    ← Back to Crate TV
                </button>
            </div>
        </div>
    );
};

export default UnsubscribePage;
