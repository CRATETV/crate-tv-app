// "Who's watching" — the cities a watch party's audience joined from.
// City-level only (from the server's location headers); no names, no exact places.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mapPosition, MAP_WIDTH, MAP_HEIGHT, CityPoint } from '../api/_lib/audienceRules';

interface MapData { points: CityPoint[]; summary: { cities: number; countries: number; viewers: number; top: CityPoint[] } }

function viewerId(): string {
    try {
        let id = localStorage.getItem('crate_viewer_id');
        if (!id) { id = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, ''); localStorage.setItem('crate_viewer_id', id); }
        return id;
    } catch { return ''; }
}

/** Counts this viewer's city once for this watch party (retries until the party exists). */
export function useAudienceCheckin(partyKey: string | undefined) {
    const { getUserIdToken, user } = useAuth();
    const tokenRef = useRef(getUserIdToken);
    tokenRef.current = getUserIdToken;
    const uid = user?.uid || null;
    useEffect(() => {
        if (!partyKey) return;
        let done = false;
        let stopped = false;
        let tries = 0;
        const attempt = async () => {
            if (done || stopped || tries++ > 24) return;
            try {
                const idToken = uid ? await tokenRef.current() : null;
                const res = await fetch('/api/audience', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'checkin', partyKey, idToken, viewerId: viewerId() }) });
                const data = await res.json().catch(() => ({}));
                // Counted, or already counted earlier: nothing more to do. Otherwise the
                // party may not have opened yet, so try again in a few minutes.
                if (data.counted === true || data.already === true) done = true;
            } catch { /* try again later */ }
        };
        attempt();
        const t = setInterval(attempt, 5 * 60 * 1000);
        return () => { stopped = true; clearInterval(t); };
    }, [partyKey, uid]);
}

function useMapData(partyKey: string, live: boolean) {
    const [data, setData] = useState<MapData | null>(null);
    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/audience?map=${encodeURIComponent(partyKey)}`);
            if (res.ok) setData(await res.json());
        } catch { /* keep the last picture */ }
    }, [partyKey]);
    useEffect(() => {
        load();
        if (!live) return;
        const t = setInterval(load, 60_000);
        return () => clearInterval(t);
    }, [load, live]);
    return data;
}

const cityText = (n: number) => `${n} ${n === 1 ? 'city' : 'cities'}`;

export const AudienceMapView: React.FC<{ data: MapData }> = ({ data }) => {
    const max = Math.max(1, ...data.points.map(p => p.viewers));
    return (
        <div className="space-y-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-[#0d0d0d]" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
                <img src="/audience-world-map.svg" alt="" className="absolute inset-0 w-full h-full" draggable={false} />
                {data.points.map((p, i) => {
                    const { xPct, yPct } = mapPosition(p.lat, p.lng);
                    const size = 8 + Math.round((p.viewers / max) * 14);
                    return (
                        <span key={i} title={`${p.city}${p.region ? `, ${p.region}` : ''} · ${p.viewers}`}
                            className="absolute rounded-full bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.9)] -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${xPct}%`, top: `${yPct}%`, width: size, height: size }} />
                    );
                })}
            </div>
            {data.summary.top.length > 0 && (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-gray-300">
                    {data.summary.top.map((p, i) => (
                        <li key={i} className="flex justify-between gap-2"><span className="truncate">{p.city}{p.region && p.country === 'US' ? `, ${p.region}` : `, ${p.country}`}</span><span className="text-gray-500">{p.viewers}</span></li>
                    ))}
                </ul>
            )}
        </div>
    );
};

/** A small "Watching from N cities" pill that opens the map. */
const AudienceMap: React.FC<{ partyKey: string; live?: boolean; label?: 'now' | 'past'; className?: string }> = ({ partyKey, live = true, label = 'now', className = '' }) => {
    const data = useMapData(partyKey, live);
    const [open, setOpen] = useState(false);
    if (!data || data.summary.cities === 0) return null;
    const { cities, countries } = data.summary;
    const text = `${label === 'now' ? 'Watching from' : 'Watched from'} ${cityText(cities)}${countries > 1 ? ` in ${countries} countries` : ''}`;
    return (
        <>
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-bold text-gray-300 ${className}`}>
                <span aria-hidden>🌍</span> {text}
            </button>
            {open && (
                <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
                    <div className="w-full max-w-2xl rounded-2xl bg-[#111] border border-white/10 p-5 text-white" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Who's watching</p>
                                <p className="text-lg font-black">{text}</p>
                            </div>
                            <button type="button" className="text-gray-400 hover:text-white text-sm" onClick={() => setOpen(false)}>Close</button>
                        </div>
                        <AudienceMapView data={data} />
                        <p className="text-[11px] text-gray-500 mt-3">Approximate city only. Nobody's name or exact location is shown or stored.</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default AudienceMap;
