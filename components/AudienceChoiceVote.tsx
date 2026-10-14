// Audience Choice — ticket holders pick their favourite film in a festival block.
// Results stay hidden until CRATE announces the winner.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';

interface Ballot {
    blockId: string; title: string; festival: string; state: 'not-open' | 'open' | 'closed' | 'no-date';
    closesAt: string | null; films: { movieKey: string; title: string; director: string; poster: string }[];
    myVote: string | null; canVote: boolean; signedIn: boolean;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
    const res = await fetch('/api/audience', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

/** Renders nothing unless `blockId` is a festival block with 2+ films and voting is open. */
const AudienceChoiceVote: React.FC<{ blockId: string; compact?: boolean; showClosedMessage?: boolean }> = ({ blockId, compact, showClosedMessage }) => {
    const { user, getUserIdToken } = useAuth();
    const { festivalData, settings } = useFestival();
    const isMultiFilmBlock = [
        ...festivalData.flatMap(d => d.blocks || []),
        ...((settings as any)?.crateFestConfig?.movieBlocks || []),
    ].some((b: any) => b.id === blockId && (b.movieKeys?.length || 0) >= 2);

    const [ballot, setBallot] = useState<Ballot | null>(null);
    const [choice, setChoice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [saved, setSaved] = useState(false);

    // Load once per block and account; a re-render must never wipe the viewer's selection.
    const tokenRef = useRef(getUserIdToken);
    tokenRef.current = getUserIdToken;
    const uid = user?.uid || null;
    const load = useCallback(async () => {
        try {
            const idToken = uid ? await tokenRef.current() : null;
            const b = await call<Ballot>({ action: 'ballot', blockId, idToken });
            setBallot(b); setChoice(prev => prev ?? b.myVote);
        } catch { setBallot(null); }
    }, [blockId, uid]);
    useEffect(() => { if (isMultiFilmBlock) load(); }, [isMultiFilmBlock, load]);

    if (showClosedMessage && ballot && ballot.state === 'closed') return (
        <div className="w-full max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#111] p-5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">🏆 Audience Choice</p>
            <p className="text-sm text-gray-300 mt-2">Voting for this block has closed. The winner will be announced soon.</p>
        </div>
    );
    if (!isMultiFilmBlock || !ballot || ballot.state !== 'open' || ballot.films.length < 2) return null;

    const vote = async () => {
        if (!choice) return;
        setBusy(true); setErr(''); setSaved(false);
        try {
            const idToken = await getUserIdToken();
            const r = await call<{ myVote: string }>({ action: 'vote', blockId, movieKey: choice, idToken });
            setBallot({ ...ballot, myVote: r.myVote }); setSaved(true);
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    const votedTitle = ballot.films.find(f => f.movieKey === ballot.myVote)?.title;

    return (
        <div className={`w-full max-w-xl mx-auto text-left rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-black/40 ${compact ? 'p-4' : 'p-5 md:p-6'}`} onClick={e => e.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">🏆 Audience Choice</p>
            <p className="text-lg font-black text-white mt-1">Which film was your favourite?</p>
            <p className="text-[12px] text-gray-400 mb-4">{ballot.title}. One vote per ticket holder. You can change it until voting closes{ballot.closesAt ? ` on ${new Date(ballot.closesAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}.</p>

            {!ballot.signedIn ? (
                <a href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="inline-block px-4 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest">Sign in to vote</a>
            ) : !ballot.canVote ? (
                <p className="text-sm text-gray-300">Voting is for ticket holders of this block.</p>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-[45vh] overflow-y-auto">
                        {ballot.films.map(f => (
                            <button key={f.movieKey} type="button" onClick={() => { setChoice(f.movieKey); setSaved(false); }}
                                className={`text-left rounded-xl overflow-hidden border transition-all ${choice === f.movieKey ? 'border-amber-400 ring-2 ring-amber-400/60' : 'border-white/10 hover:border-white/30'}`}>
                                <div className="aspect-[2/3] bg-white/5">{f.poster && <img src={f.poster} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
                                <div className="p-2">
                                    <p className="text-[12px] font-bold text-white leading-tight line-clamp-2">{f.title}</p>
                                    {f.director && <p className="text-[10px] text-gray-500 truncate">{f.director}</p>}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button type="button" disabled={!choice || busy || choice === ballot.myVote} onClick={vote}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-widest disabled:opacity-40">
                            {busy ? 'Saving…' : ballot.myVote ? 'Change my vote' : 'Cast my vote'}
                        </button>
                        {ballot.myVote && <p className="text-[12px] text-emerald-300">{saved ? 'Saved! ' : ''}Your vote: <strong>{votedTitle}</strong></p>}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-3">The winner is announced after the festival and gets the Audience Choice laurel.</p>
                </>
            )}
            {err && <p className="text-sm text-red-400 mt-3">{err}</p>}
        </div>
    );
};

export default AudienceChoiceVote;
