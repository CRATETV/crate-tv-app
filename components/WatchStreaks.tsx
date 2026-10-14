// Watch streaks: counts real watching (5+ minutes) and shows badges.
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from './Toast';
import { WATCH_MINUTES_TO_COUNT } from '../api/_lib/streakRules';

interface Badge { id: string; label: string; emoji: string; earnedAt: string }
interface Summary {
    monthly: { current: number; best: number; watchedThisMonth: boolean; nextMilestone: number | null };
    badges: Badge[];
    festivals: { id: string; label: string; watched: number; total: number; remaining: string[]; complete: boolean }[];
    nudge: string | null;
}

async function callStreaks<T>(body: Record<string, unknown>): Promise<T> {
    const res = await fetch('/api/streaks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

/**
 * Counts this film/watch party toward the viewer's streaks once they've
 * actually watched 5 minutes of it (time only runs while `active` and the tab
 * is visible). Once per film per browser session.
 */
export function useWatchMilestone(kind: 'party' | 'film', key: string | undefined, active: boolean) {
    const { user, getUserIdToken } = useAuth();
    const tokenRef = useRef(getUserIdToken);
    tokenRef.current = getUserIdToken;
    const seconds = useRef(0);
    const uid = user?.uid;
    useEffect(() => { seconds.current = 0; }, [key]);
    useEffect(() => {
        if (!uid || !key || !active) return;
        const flag = `crate_streak_${kind}_${key}`;
        try { if (sessionStorage.getItem(flag)) return; } catch { /* private mode: still fine */ }
        const t = setInterval(async () => {
            if (document.visibilityState !== 'visible') return;
            seconds.current += 10;
            if (seconds.current < WATCH_MINUTES_TO_COUNT * 60) return;
            clearInterval(t);
            try { sessionStorage.setItem(flag, '1'); } catch { /* ignore */ }
            try {
                const idToken = await tokenRef.current();
                const r = await callStreaks<{ counted: boolean; added: Badge[] }>({ action: 'record', idToken, kind, key });
                for (const b of r.added || []) toast.success(`${b.emoji} New badge: ${b.label}`);
            } catch { /* a missed streak count is never worth bothering the viewer */ }
        }, 10_000);
        return () => clearInterval(t);
    }, [uid, key, kind, active]);
}

/** Streak + badges card for the account and My Festival pages. */
export const StreaksCard: React.FC = () => {
    const { user, getUserIdToken } = useAuth();
    const tokenRef = useRef(getUserIdToken);
    tokenRef.current = getUserIdToken;
    const [data, setData] = useState<Summary | null>(null);
    const uid = user?.uid;
    useEffect(() => {
        if (!uid) return;
        let gone = false;
        (async () => {
            try {
                const idToken = await tokenRef.current();
                const s = await callStreaks<Summary>({ action: 'mine', idToken });
                if (!gone) setData(s);
            } catch { /* card just stays hidden */ }
        })();
        return () => { gone = true; };
    }, [uid]);
    if (!uid || !data) return null;
    const { monthly, badges, festivals, nudge } = data;
    const nothingYet = monthly.best === 0 && badges.length === 0;

    return (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 mb-3">Your streaks</p>
            {nothingYet ? (
                <p className="text-sm text-gray-400">Watch any film for {WATCH_MINUTES_TO_COUNT} minutes to start your streak. Watch every block of a festival to earn its badge.</p>
            ) : (
                <div className="space-y-5">
                    <div className="flex items-end gap-6 flex-wrap">
                        <div>
                            <p className="text-4xl font-black leading-none">{monthly.current > 0 ? '🔥' : '🌙'} {monthly.current}</p>
                            <p className="text-[11px] text-gray-400 mt-1">month{monthly.current === 1 ? '' : 's'} in a row</p>
                        </div>
                        <div className="text-[12px] text-gray-400 pb-1">
                            <p>Best: <strong className="text-white">{monthly.best}</strong></p>
                            {!monthly.watchedThisMonth && monthly.current > 0 && <p className="text-amber-300">Watch something this month to keep it going.</p>}
                            {monthly.watchedThisMonth && monthly.nextMilestone && <p>{monthly.nextMilestone - monthly.current} more to your {monthly.nextMilestone}-month badge.</p>}
                        </div>
                    </div>
                    {nudge && <p className="text-sm text-amber-200 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">{nudge}</p>}
                    {festivals.length > 0 && (
                        <ul className="space-y-2">
                            {festivals.map(f => (
                                <li key={f.id}>
                                    <div className="flex justify-between text-[12px]"><span className="text-gray-200">{f.label}</span><span className="text-gray-400">{f.complete ? 'Complete 🎟️' : `${f.watched} of ${f.total} blocks`}</span></div>
                                    <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden"><div className={`h-full ${f.complete ? 'bg-emerald-400' : 'bg-red-500'}`} style={{ width: `${Math.round((f.watched / Math.max(1, f.total)) * 100)}%` }} /></div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {badges.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {badges.map(b => (
                                <span key={b.id} title={`Earned ${new Date(b.earnedAt).toLocaleDateString()}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[12px]">
                                    <span aria-hidden>{b.emoji}</span>{b.label}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};
