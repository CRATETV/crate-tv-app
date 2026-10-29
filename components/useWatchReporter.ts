import { useEffect, useRef } from 'react';
import { binOf, isFinished } from '../api/_lib/watchStats';

// Tells /api/track-watch which tenth of the film is being watched, so the
// admin can see plays, finish rate and where people stop. Every 5 seconds it
// looks at the player; a tenth only counts when the viewer got there by
// watching (a jump of more than 15 seconds is a seek and doesn't count the
// part that was skipped). Each tenth is reported once per time the film opens.
export function useWatchReporter(opts: {
    active: boolean;
    movieKey: string | undefined;
    episode: number;          // 1-based episode number, 0 for a film
    getPosition: () => { t: number; d: number } | null;
}) {
    const { active, movieKey, episode } = opts;
    const getRef = useRef(opts.getPosition);
    getRef.current = opts.getPosition;

    useEffect(() => {
        if (!active || !movieKey) return;
        const sent = new Set<string>();
        let last = -1;
        const send = (event: 'start' | 'bin' | 'fin', bin?: number) => {
            const id = event === 'bin' ? `b${bin}` : event;
            if (sent.has(id)) return;
            sent.add(id);
            try {
                fetch('/api/track-watch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movieKey, event, ...(bin != null ? { bin } : {}), ...(episode > 0 ? { episode } : {}) }),
                    keepalive: true,
                }).catch(() => {});
            } catch { /* tracking must never break playback */ }
        };
        const tick = () => {
            let pos: { t: number; d: number } | null = null;
            try { pos = getRef.current(); } catch { pos = null; }
            if (!pos || !(pos.d > 0)) return;
            const moved = last >= 0 && pos.t > last && pos.t - last <= 15;
            const first = last < 0 && pos.t > 0.5;
            last = pos.t;
            if (!moved && !first) return;
            send('start');
            const b = binOf(pos.t, pos.d);
            if (b >= 0) send('bin', b);
            if (isFinished(pos.t, pos.d)) send('fin');
        };
        const id = window.setInterval(tick, 5000);
        return () => window.clearInterval(id);
    }, [active, movieKey, episode]);
}
