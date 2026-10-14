// Admin: Audience Choice results per festival block, with a one-click award.
import React, { useCallback, useEffect, useState } from 'react';

interface Row { movieKey: string; votes: number; share: number; title?: string; director?: string; poster?: string; awardName?: string | null; awardYear?: string | null }
interface BlockResult { blockId: string; title: string; festival: string; state: string; total: number; leaders: string[]; results: Row[] }

async function call<T>(body: Record<string, unknown>): Promise<T> {
    const password = sessionStorage.getItem('adminPassword') || '';
    const res = await fetch('/api/audience', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, password }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

const STATE_LABEL: Record<string, string> = { open: 'Voting open', closed: 'Voting closed', 'not-open': 'Not started', 'no-date': 'No date' };

const AudienceChoiceAdmin: React.FC = () => {
    const [blocks, setBlocks] = useState<BlockResult[] | null>(null);
    const [err, setErr] = useState('');
    const [msg, setMsg] = useState('');
    const [busy, setBusy] = useState('');
    const year = String(new Date().getFullYear());

    const load = useCallback(async () => {
        try { setBlocks((await call<{ blocks: BlockResult[] }>({ action: 'results' })).blocks); setErr(''); }
        catch (e) { setErr((e as Error).message); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const award = async (row: Row) => {
        const current = row.awardName ? `\n\nThis film currently shows "${row.awardName} ${row.awardYear || ''}". That will be replaced.` : '';
        if (!window.confirm(`Give "${row.title}" the Audience Choice Award ${year}?${current}`)) return;
        setBusy(row.movieKey); setMsg(''); setErr('');
        try {
            await call({ action: 'award', movieKey: row.movieKey, awardName: 'Audience Choice Award', awardYear: year });
            setMsg(`🏆 "${row.title}" now shows the Audience Choice Award ${year} laurel.`);
            await load();
        } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-gray-400 max-w-2xl">Ticket holders vote for their favourite film in each block, from the start of the screening until its rewatch week ends. Viewers never see the counts. When voting closes, give the winner its laurel here.</p>
                <button type="button" onClick={load} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white">Refresh</button>
            </div>
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            {err && <p className="text-sm text-red-400">{err}</p>}
            {!blocks && !err && <p className="text-sm text-gray-500">Loading…</p>}
            {blocks?.length === 0 && <p className="text-sm text-gray-500">No votes yet. Voting opens when a block with 2 or more films starts screening.</p>}
            {blocks?.map(b => (
                <div key={b.blockId} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{b.festival}</p>
                            <p className="text-lg font-black text-white">{b.title}</p>
                        </div>
                        <p className="text-xs text-gray-400">{STATE_LABEL[b.state] || b.state} · {b.total} vote{b.total === 1 ? '' : 's'}{b.leaders.length > 1 ? ' · tie for first' : ''}</p>
                    </div>
                    <div className="space-y-2">
                        {b.results.map(r => {
                            const leading = b.leaders.includes(r.movieKey);
                            const hasAward = r.awardName === 'Audience Choice Award' && r.awardYear === year;
                            return (
                                <div key={r.movieKey} className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={`truncate ${leading ? 'font-black text-amber-300' : 'text-gray-200'}`}>{leading ? '🏆 ' : ''}{r.title}</span>
                                            <span className="text-gray-400 ml-2 flex-shrink-0">{r.votes} · {r.share}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden"><div className={`h-full ${leading ? 'bg-amber-400' : 'bg-white/25'}`} style={{ width: `${r.share}%` }} /></div>
                                    </div>
                                    {hasAward
                                        ? <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex-shrink-0">Awarded</span>
                                        : leading && b.total > 0 && (
                                            <button type="button" disabled={!!busy} onClick={() => award(r)}
                                                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                                                {busy === r.movieKey ? 'Saving…' : 'Award'}
                                            </button>
                                        )}
                                </div>
                            );
                        })}
                    </div>
                    {b.state === 'open' && <p className="text-[11px] text-gray-500 mt-3">Voting is still open, so these numbers can change. Best to award after it closes.</p>}
                </div>
            ))}
        </div>
    );
};

export default AudienceChoiceAdmin;
