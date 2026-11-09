import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Movie } from '../../types';
import { Button, Card, EmptyState, Notice, Pill, SectionTitle, adminPost, inputClass } from './ui';
import { intakeState } from '../../api/_lib/filmIntake';

// "Films to add" checklist. Paste the films still to be put into the catalog
// (a whole festival). Each one ticks itself off when a film with that title
// shows up in the catalog. Refreshes every 15 seconds, so it stays current while
// you work in the Films tab.

interface Item { id: string; title: string; filmmaker: string; festival: string; manualDone: boolean }
const POLL_MS = 15_000;

const FilmIntakeList: React.FC<{ movies: Record<string, Movie> }> = ({ movies }) => {
    const [items, setItems] = useState<Item[] | null>(null);
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    const [festival, setFestival] = useState('');
    const [adding, setAdding] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [showDone, setShowDone] = useState(false);
    const [note, setNote] = useState('');

    const load = useCallback(async () => {
        try {
            const d = await adminPost<{ items: Item[] }>('/api/film-intake', { action: 'list' });
            setItems(d.items); setError('');
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the list.'); }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    const catalog = useMemo(() => Object.entries(movies || {}).map(([key, m]) => ({ key, title: (m as Movie).title || '', director: (m as Movie).director })), [movies]);

    const rows = useMemo(() => (items || []).map(it => ({ it, st: intakeState(it, catalog) })), [items, catalog]);
    const todo = rows.filter(r => r.st.state !== 'done');
    const done = rows.filter(r => r.st.state === 'done');

    const act = async (body: Record<string, unknown>, optimistic?: () => void) => {
        optimistic?.();
        try { await adminPost('/api/film-intake', body); } catch (e) { setError(e instanceof Error ? e.message : 'That did not save.'); }
        load();
    };

    const add = async () => {
        setAdding(true); setNote('');
        try {
            const r = await adminPost<{ added: number; skipped: number }>('/api/film-intake', { action: 'add', text, festival });
            setNote(`Added ${r.added} film${r.added === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} already on the list)` : ''}.`);
            setText(''); setShowAdd(false); load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not add those.'); }
        finally { setAdding(false); }
    };

    const total = rows.length;
    const hint = items === null ? 'Loading…' : total === 0 ? 'Paste your festival lineup to start a checklist.'
        : todo.length === 0 ? `All ${total} are in the catalog.` : `${done.length} of ${total} done · ${todo.length} still to add`;

    return (
        <section className="space-y-4">
            <SectionTitle title="Films to add" hint={hint}
                right={<Button size="sm" onClick={() => setShowAdd(v => !v)}>{showAdd ? 'Close' : '+ Add films'}</Button>} />
            {error && <Notice tone="error">{error}</Notice>}
            {note && <Notice tone="success">{note}</Notice>}

            {showAdd && (
                <Card>
                    <p className="text-sm text-[#A1A1AD] mb-3">One film per line. To add the filmmaker, put a dash after the title: <span className="text-white">Mirror Dance - Jane Doe</span>. You can paste straight from a spreadsheet.</p>
                    <textarea className={`${inputClass} min-h-[140px]`} value={text} onChange={e => setText(e.target.value)} placeholder={'Mirror Dance - Jane Doe\nNeighbors - Sam Lee'} />
                    <div className="flex flex-col sm:flex-row gap-3 mt-3">
                        <input className={inputClass} value={festival} onChange={e => setFestival(e.target.value)} placeholder="Festival or batch name (optional), e.g. PWFF 2026" />
                        <Button variant="primary" accent="orange" onClick={add} disabled={adding || !text.trim()}>{adding ? 'Adding…' : 'Add to list'}</Button>
                    </div>
                </Card>
            )}

            {items !== null && total === 0 && !showAdd && (
                <EmptyState icon="📋" title="Nothing on the list" text="Press “+ Add films” and paste the films you still need to put in the catalog." />
            )}

            {todo.length > 0 && (
                <Card className="!p-0 overflow-hidden">
                    <ul className="divide-y divide-white/[0.06]">
                        {todo.map(({ it, st }) => (
                            <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                                <input type="checkbox" aria-label={`Mark ${it.title} done`} className="h-5 w-5 shrink-0 accent-orange-500"
                                    checked={false} onChange={() => act({ action: 'toggle', id: it.id, done: true }, () => setItems(p => p && p.map(x => x.id === it.id ? { ...x, manualDone: true } : x)))} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-semibold truncate">{it.title}</p>
                                    <p className="text-xs text-[#8A8A96] truncate">{[it.filmmaker, it.festival].filter(Boolean).join(' · ') || ' '}</p>
                                    {st.state === 'maybe' && <p className="text-xs text-amber-300 mt-0.5">Looks like <strong>{st.film.title}</strong> in the catalog. Tick the box if that's it.</p>}
                                </div>
                                <button className="text-xs text-[#8A8A96] hover:text-white px-2 py-1" onClick={() => act({ action: 'delete', id: it.id }, () => setItems(p => p && p.filter(x => x.id !== it.id)))}>Remove</button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {done.length > 0 && (
                <div>
                    <button onClick={() => setShowDone(v => !v)} aria-expanded={showDone} className="text-sm font-bold text-[#A1A1AD] hover:text-white">
                        {showDone ? '▾' : '▸'} Done ({done.length})
                    </button>
                    {showDone && (
                        <Card className="!p-0 overflow-hidden mt-3">
                            <ul className="divide-y divide-white/[0.06]">
                                {done.map(({ it, st }) => (
                                    <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                                        <span className="text-green-400" aria-hidden>✓</span>
                                        <p className="min-w-0 flex-1 text-[#A1A1AD] truncate">{it.title}</p>
                                        {st.state === 'done' && st.via === 'catalog' ? <Pill accent="green">In catalog</Pill> : <Pill>Ticked by hand</Pill>}
                                        {st.state === 'done' && st.via === 'manual' && (
                                            <button className="text-xs text-[#8A8A96] hover:text-white px-2 py-1" onClick={() => act({ action: 'toggle', id: it.id, done: false }, () => setItems(p => p && p.map(x => x.id === it.id ? { ...x, manualDone: false } : x)))}>Undo</button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="px-4 py-3 border-t border-white/[0.06]">
                                <Button size="sm" onClick={() => act({ action: 'delete', clearDone: done.map(d => d.it.id) })}>Clear the done list</Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </section>
    );
};

export default FilmIntakeList;
