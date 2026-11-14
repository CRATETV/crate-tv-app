// /help — a link anyone can open (signed in or not) to send Crate TV a help
// request. Same backend as the festival "Need help?" button (api/festival-help
// action "report"), so it lands in the dashboard mailbox as an Open ticket.
// The device, browser and page they came from are captured automatically.
import React, { useEffect, useState } from 'react';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';

type Category = 'restart' | 'playback' | 'tv' | 'signin' | 'ticket' | 'other';

const CHOICES: { id: Category; label: string }[] = [
    { id: 'restart', label: 'The film keeps restarting' },
    { id: 'playback', label: 'The film won’t play' },
    { id: 'tv', label: 'Roku or TV problem' },
    { id: 'signin', label: 'Can’t sign in' },
    { id: 'ticket', label: 'Ticket or payment' },
    { id: 'other', label: 'Something else' },
];

const RESTART_WHEN = ['On its own, while I’m watching', 'After I leave the page and come back', 'When I press play', 'Not sure'];

const input = 'w-full bg-black/40 border border-white/15 rounded-xl px-3 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-red-500';
const label = 'block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2';

const HelpPage: React.FC = () => {
    const { user, getUserIdToken } = useAuth();
    const params = new URLSearchParams(window.location.search);
    const [category, setCategory] = useState<Category | null>(null);
    const [email, setEmail] = useState('');
    const [film, setFilm] = useState(params.get('film') || '');
    const [restartWhen, setRestartWhen] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [reference, setReference] = useState('');

    useEffect(() => { if (user?.email && !email) setEmail(user.email); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const send = async () => {
        setBusy(true); setErr('');
        try {
            const idToken = user ? await getUserIdToken() : undefined;
            const text = [
                category === 'restart' && restartWhen ? `Restarts: ${restartWhen}.` : '',
                message.trim(),
            ].filter(Boolean).join('\n\n');
            const res = await fetch('/api/festival-help', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'report', idToken, contactEmail: email.trim() || user?.email, category: category || 'other',
                    message: text, film: film.trim(),
                    // Where they came from (a link with ?from=roku etc.) plus this page.
                    page: `${window.location.pathname}${window.location.search}`,
                    userAgent: navigator.userAgent,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
            setReference(data.reference);
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };

    const canSend = !!category && !busy && (!!email.trim() || !!user?.email) && (category !== 'other' || !!message.trim());

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <div className="max-w-xl mx-auto px-4 pt-24 pb-20">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-3">Crate TV help</p>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-3">Something not working?</h1>

                {reference ? (
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mt-6 space-y-2">
                        <p className="text-lg font-bold text-emerald-300">Got it. Thank you.</p>
                        <p className="text-sm text-gray-300">We’ll reply by email. Your reference is <strong className="text-white">{reference}</strong>.</p>
                        <p className="text-sm text-gray-400">Check your spam folder if you don’t see our reply.</p>
                    </div>
                ) : (
                    <div className="space-y-6 mt-4">
                        <p className="text-gray-400 text-sm">Tell us what happened and we’ll sort it out. We’ll see your device and browser automatically, so you don’t need to explain those.</p>

                        <div>
                            <span className={label}>What’s going on?</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {CHOICES.map(c => (
                                    <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                                        className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${category === c.id ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {category && (
                            <>
                                <div>
                                    <label className={label} htmlFor="help-film">Which film? (if you know)</label>
                                    <input id="help-film" className={input} value={film} onChange={e => setFilm(e.target.value)} maxLength={120} placeholder="Film title" />
                                </div>

                                {category === 'restart' && (
                                    <div>
                                        <span className={label}>When does it restart?</span>
                                        <div className="grid grid-cols-1 gap-2">
                                            {RESTART_WHEN.map(r => (
                                                <button key={r} type="button" onClick={() => setRestartWhen(r)}
                                                    className={`text-left px-4 py-3 rounded-xl border text-sm ${restartWhen === r ? 'bg-white text-black font-bold border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{r}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className={label} htmlFor="help-msg">Anything else we should know?</label>
                                    <textarea id="help-msg" className={`${input} min-h-[110px]`} value={message} onChange={e => setMessage(e.target.value)} maxLength={2000}
                                        placeholder={category === 'tv' ? 'What TV or Roku do you have? What do you see on screen?' : 'What did you see happen?'} />
                                </div>

                                <div>
                                    <label className={label} htmlFor="help-email">Your email, so we can reply</label>
                                    <input id="help-email" className={input} type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                                </div>

                                <button type="button" onClick={send} disabled={!canSend}
                                    className="w-full px-4 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-40">
                                    {busy ? 'Sending…' : 'Send to Crate TV'}
                                </button>
                            </>
                        )}
                        {err && <p className="text-sm text-red-400">{err}</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HelpPage;
