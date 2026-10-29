import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// "Remind me" under an upcoming premiere: an email a day before and 15 minutes
// before. Signed-in viewers only (the email goes to their account address).
// api/premiere-remind.ts, api/_lib/premiereReminders.ts.
let cache: { uid: string; keys: Set<string> } | null = null;

const RemindMeButton: React.FC<{ itemId: string; hasTicket?: boolean }> = ({ itemId, hasTicket }) => {
    const { user, getUserIdToken } = useAuth();
    const [on, setOn] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        let cancelled = false;
        if (!user) { setOn(false); return; }
        (async () => {
            if (cache?.uid === user.uid) { setOn(cache.keys.has(itemId)); return; }
            const idToken = await getUserIdToken();
            if (!idToken) return;
            const res = await fetch('/api/premiere-remind', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, action: 'mine' }) }).catch(() => null);
            if (!res || !res.ok || cancelled) return;
            const data = await res.json().catch(() => ({}));
            cache = { uid: user.uid, keys: new Set<string>(data.movieKeys || []) };
            if (!cancelled) setOn(cache.keys.has(itemId));
        })();
        return () => { cancelled = true; };
    }, [user?.uid, itemId, getUserIdToken]);

    if (hasTicket) return <p className="text-[11px] text-gray-400 px-1">We'll email you a day before and 15 minutes before.</p>;

    if (!user) {
        return (
            <a href="/login" className="inline-block text-[11px] font-bold text-gray-300 hover:text-white underline underline-offset-4 px-1 py-1">
                Sign in to get an email reminder
            </a>
        );
    }

    const toggle = async () => {
        setBusy(true); setMsg('');
        const idToken = await getUserIdToken();
        const res = idToken ? await fetch('/api/premiere-remind', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, action: on ? 'remove' : 'add', movieKey: itemId }) }).catch(() => null) : null;
        if (res && res.ok) {
            const next = !on;
            setOn(next);
            if (cache?.uid === user.uid) { next ? cache.keys.add(itemId) : cache.keys.delete(itemId); }
        } else {
            const data = res ? await res.json().catch(() => ({})) : {};
            setMsg(data.error || 'Could not save that. Please try again.');
        }
        setBusy(false);
    };

    return (
        <div className="px-1">
            <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
                className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors disabled:opacity-60 ${on ? 'bg-green-600/20 border-green-500/40 text-green-400' : 'border-white/20 text-gray-200 hover:bg-white/10'}`}>
                <span aria-hidden="true">{on ? '✓' : '🔔'}</span>
                {on ? "Reminder on: we'll email you" : 'Remind me by email'}
            </button>
            {msg && <p role="alert" className="text-[11px] text-red-400 mt-1">{msg}</p>}
        </div>
    );
};

export default RemindMeButton;
