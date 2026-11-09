import React, { useState } from 'react';
import type { PartyPoll } from '../../api/_lib/watchPartyPoll';

// Control Room: start a lobby poll, watch the votes come in, reveal the results.

const call = async (body: Record<string, unknown>) => {
    const password = sessionStorage.getItem('adminPassword');
    const res = await fetch('/api/watch-party-poll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'That did not work. Try again.');
    return data;
};

const WatchPartyPollControls: React.FC<{ movieKey: string; poll?: PartyPoll | null }> = ({ movieKey, poll }) => {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [answers, setAnswers] = useState('');
    const [counts, setCounts] = useState<number[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    const run = async (fn: () => Promise<void>) => {
        setBusy(true); setMsg('');
        try { await fn(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
    };

    const start = () => run(async () => {
        await call({ action: 'set', movieKey, question, options: answers.split('\n') });
        setQuestion(''); setAnswers(''); setCounts(null); setMsg('Poll is live in the lobby.');
    });
    const refresh = () => run(async () => { const d = await call({ action: 'tally', movieKey }); setCounts(d.counts); });
    const reveal = () => run(async () => { const d = await call({ action: 'reveal', movieKey }); setCounts(d.counts); setMsg('Results are showing to everyone.'); });
    const clear = () => run(async () => { await call({ action: 'clear', movieKey }); setCounts(null); setMsg('Poll removed.'); });

    const total = counts ? counts.reduce((s, c) => s + c, 0) : 0;

    return (
        <div className="basis-full rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-left" aria-expanded={open}>
                <span className="font-bold text-white">🗳️ Lobby poll {poll?.id ? <span className="ml-2 text-xs font-black uppercase tracking-widest text-emerald-400">{poll.showResults ? 'results showing' : poll.status === 'open' ? 'live' : 'closed'}</span> : null}</span>
                <span className="text-gray-500 text-sm">{open ? 'Hide' : 'Open'}</span>
            </button>

            {open && (
                <div className="mt-4 space-y-4">
                    {poll?.id && (
                        <div className="rounded-lg bg-black/30 border border-white/10 p-3">
                            <p className="text-white font-semibold">{poll.question}</p>
                            <ul className="mt-2 text-sm text-gray-300 space-y-1">
                                {poll.options.map((o, i) => (
                                    <li key={i} className="flex justify-between"><span>{o}</span>{counts && <span className="font-black text-white">{counts[i]}</span>}</li>
                                ))}
                            </ul>
                            {counts && <p className="text-xs text-gray-500 mt-2">{total} vote{total === 1 ? '' : 's'} so far</p>}
                            <div className="flex flex-wrap gap-2 mt-3">
                                <button disabled={busy} onClick={refresh} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-bold disabled:opacity-50">Refresh votes</button>
                                <button disabled={busy || poll.showResults} onClick={reveal} className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">Close voting + show results</button>
                                <button disabled={busy} onClick={clear} className="px-3 py-2 rounded-lg bg-white/5 text-gray-400 text-xs font-bold disabled:opacity-50">Remove poll</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{poll?.id ? 'Start a new poll (replaces this one)' : 'Start a poll'}</p>
                        <input value={question} onChange={e => setQuestion(e.target.value)} maxLength={140} placeholder="Will Marcus tell the truth?" className="form-input w-full text-sm" />
                        <textarea value={answers} onChange={e => setAnswers(e.target.value)} rows={3} placeholder={'One answer per line (2 to 4)\nYes\nNo\nNot sure yet'} className="form-input w-full text-sm" />
                        <button disabled={busy || !question.trim() || !answers.trim()} onClick={start} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">Start poll</button>
                    </div>
                    {msg && <p className="text-sm text-amber-300" role="status">{msg}</p>}
                </div>
            )}
        </div>
    );
};

export default WatchPartyPollControls;
