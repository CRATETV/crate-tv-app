// components/MonthlySpotlightTab.tsx
import React, { useState, useEffect } from 'react';
import { nextSendDate, spotlightStatus } from '../api/_lib/spotlightRules';
import { Movie } from '../types';

interface Props {
    allMovies: Record<string, Movie>;
}

const MonthlySpotlightTab: React.FC<Props> = ({ allMovies }) => {
    const [selectedKey, setSelectedKey]   = useState('');
    const [currentKey, setCurrentKey]     = useState('');
    const [sentAt, setSentAt]             = useState<string | null>(null);
    const [lastSentTo, setLastSentTo]     = useState<number | null>(null);
    const [saving, setSaving]             = useState(false);
    const [testing, setTesting]           = useState(false);
    const [message, setMessage]           = useState('');

    const movies = Object.values(allMovies).filter(m => m && m.title && !m.isUnlisted);
    const selected = allMovies[selectedKey];
    const now = new Date();
    const monthName = now.toLocaleString('en-US', { month: 'long' });

    // The real next send date, from what is saved (not always "next month").
    const [doc, setDoc] = useState<any>(null);
    const [previewTo, setPreviewTo] = useState(() => { try { return localStorage.getItem('crate-spotlight-preview-to') || ''; } catch { return ''; } });
    const nextFirstMonday = nextSendDate(doc, now).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const state = spotlightStatus(doc, now);

    useEffect(() => {
        const password = sessionStorage.getItem('adminPassword') || '';
        fetch('/api/set-monthly-spotlight')
            .then(r => r.json())
            .then(data => {
                setDoc(data);
                if (data.movieKey) {
                    setCurrentKey(data.movieKey);
                    setSelectedKey(data.movieKey);
                }
                if (data.sentAt) {
                    const d = data.sentAt._seconds
                        ? new Date(data.sentAt._seconds * 1000)
                        : new Date(data.sentAt);
                    setSentAt(d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
                }
                if (data.lastSentTo) setLastSentTo(data.lastSentTo);
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        if (!selectedKey) return;
        setSaving(true);
        setMessage('');
        const password = sessionStorage.getItem('adminPassword') || '';
        try {
            const res = await fetch('/api/set-monthly-spotlight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, movieKey: selectedKey }),
            });
            if (res.ok) {
                setCurrentKey(selectedKey);
                setDoc((d: any) => ({ ...(d || {}), movieKey: selectedKey, setAt: new Date() }));
                setMessage(`✅ "${allMovies[selectedKey]?.title}" set as the monthly spotlight.`);
            } else {
                setMessage('❌ Failed to save. Try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Sends the email to YOUR address only, so you can see what subscribers will get.
    const handlePreview = async () => {
        if (!currentKey) return;
        setTesting(true);
        setMessage('');
        try { localStorage.setItem('crate-spotlight-preview-to', previewTo); } catch { /* none */ }
        try {
            const res = await fetch('/api/set-monthly-spotlight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: sessionStorage.getItem('adminPassword') || '', action: 'preview', to: previewTo, movieKey: currentKey }),
            });
            const data = await res.json().catch(() => ({}));
            setMessage(res.ok ? `✅ Preview sent to ${data.sentTo}. Check your inbox (and spam).` : `❌ ${data.error || 'Could not send the preview.'}`);
        } catch {
            setMessage('❌ Could not send the preview. Try again.');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Monthly Spotlight</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Pick one film. On the first Monday of each month at 9am, it goes out automatically to all your subscribers.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Next Send</p>
                    <p className="text-white font-bold text-sm">{nextFirstMonday}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Last Sent</p>
                    <p className="text-white font-bold text-sm">{sentAt || '—'}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Last Reach</p>
                    <p className="text-white font-bold text-sm">{lastSentTo ? `${lastSentTo} subscribers` : '—'}</p>
                </div>
            </div>

            {/* Current spotlight */}
            {currentKey && allMovies[currentKey] && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
                    {allMovies[currentKey].poster && (
                        <img src={allMovies[currentKey].poster} alt="" className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div>
                        <p className="text-amber-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">{monthName} Spotlight</p>
                        <p className="text-white font-bold">{allMovies[currentKey].title}</p>
                        <p className="text-gray-400 text-xs">{allMovies[currentKey].director}</p>
                    </div>
                </div>
            )}

            {/* Film picker */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                <h3 className="text-white font-black text-sm uppercase tracking-widest">Choose Next Spotlight Film</h3>

                <select
                    value={selectedKey}
                    onChange={e => setSelectedKey(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/40"
                >
                    <option value="">— Select a film —</option>
                    {movies
                        .sort((a, b) => a.title.localeCompare(b.title))
                        .map(m => (
                            <option key={m.key} value={m.key}>{m.title}</option>
                        ))
                    }
                </select>

                {/* Preview */}
                {selected && (
                    <div className="flex gap-4 items-start bg-black/30 rounded-xl p-4">
                        {selected.poster && (
                            <img src={selected.poster} alt="" className="w-16 h-24 object-cover rounded-lg flex-shrink-0" />
                        )}
                        <div>
                            <p className="text-white font-bold">{selected.title}</p>
                            {selected.director && <p className="text-gray-400 text-xs mb-2">Directed by {selected.director}</p>}
                            {selected.synopsis && (
                                <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">
                                    {selected.synopsis.replace(/<[^>]+>/g, '').substring(0, 160)}…
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {message && (
                    <p className="text-sm font-medium text-gray-300">{message}</p>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={!selectedKey || saving}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
                    >
                        {saving ? 'Saving…' : 'Set as Spotlight'}
                    </button>
                </div>

                <div className="border-t border-white/5 pt-4 space-y-2">
                    <p className="text-gray-400 text-xs">Want to see the email first? Send a preview to yourself. It never goes to subscribers.</p>
                    <div className="flex gap-3">
                        <input
                            type="email"
                            value={previewTo}
                            onChange={e => setPreviewTo(e.target.value)}
                            placeholder="your@email.com"
                            className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
                        />
                        <button
                            onClick={handlePreview}
                            disabled={!currentKey || testing || !previewTo.trim()}
                            className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 text-gray-300 hover:text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all"
                        >
                            {testing ? 'Sending…' : 'Email me a preview'}
                        </button>
                    </div>
                    {!currentKey && <p className="text-gray-600 text-[10px]">Press “Set as Spotlight” first, then you can preview it.</p>}
                </div>
            </div>
        </div>
    );
};

export default MonthlySpotlightTab;
