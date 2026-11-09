import React, { useState } from 'react';
import { Movie } from '../../types';
import { useFestival } from '../../contexts/FestivalContext';
import { MovieSelectorModal } from '../CategoryEditor';
import { Button, Card, EmptyState, Notice, SectionTitle, adminPost, inputClass } from './ui';
import { Season, SeasonTheme, THEME_DEFAULTS, THEME_LABELS, activeSeason, legacyCratemasKeys, newSeasonId, normalizeSeasons } from '../../api/_lib/seasons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DateParts: React.FC<{ value: string; onChange: (v: string) => void; label: string }> = ({ value, onChange, label }) => {
    const m = Number(value.slice(0, 2)) || 1, d = Number(value.slice(3)) || 1;
    const set = (mm: number, dd: number) => onChange(`${String(mm).padStart(2, '0')}-${String(Math.min(31, Math.max(1, dd))).padStart(2, '0')}`);
    return (
        <div><p className="text-xs font-bold text-[#8A8A96] mb-1">{label}</p>
            <div className="flex gap-2">
                <select className={inputClass} value={m} onChange={e => set(Number(e.target.value), d)}>{MONTHS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
                <input className={inputClass} type="number" min={1} max={31} value={d} onChange={e => set(m, Number(e.target.value))} style={{ maxWidth: 80 }} />
            </div></div>
    );
};

// Admin → Categories: create seasons (Cratemas, Valentine's…), give each a look, dates and films.
const SeasonsManager: React.FC<{ allMovies: Movie[] }> = ({ allMovies }) => {
    const { settings, categories } = useFestival();
    const [seasons, setSeasons] = useState<Season[]>(() => normalizeSeasons((settings as any).seasons));
    const [picking, setPicking] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [dirty, setDirty] = useState(false);
    const live = activeSeason(seasons);

    const change = (id: string, patch: Partial<Season>) => { setSeasons(list => list.map(s => s.id === id ? { ...s, ...patch } : s)); setDirty(true); };
    const add = (theme: SeasonTheme, keys: string[] = []) => {
        const d = THEME_DEFAULTS[theme];
        setSeasons(list => [...list, { id: newSeasonId(), name: d.name, tagline: d.tagline, theme, start: d.start, end: d.end, mode: 'auto', movieKeys: keys }]);
        setDirty(true);
    };
    const remove = (id: string) => { setSeasons(list => list.filter(s => s.id !== id)); setDirty(true); };
    const save = async () => {
        setBusy(true); setNote(null);
        try {
            await adminPost('/api/publish-data', { type: 'settings', data: { seasons } });
            setDirty(false); setNote({ tone: 'success', text: 'Saved. The homepage picks it up in a moment.' });
        } catch { setNote({ tone: 'error', text: 'Could not save. Try again.' }); }
        setBusy(false);
    };

    return (
        <div className="space-y-5">
            <SectionTitle title="Seasons" hint="Cratemas, Valentine's, Halloween… Each one turns on and off by itself on its dates, dressed for the season." />
            {note && <Notice tone={note.tone}>{note.text}</Notice>}
            <Notice tone="info">{live ? `Showing on the homepage right now: ${live.name}.` : 'No season is showing right now.'}</Notice>

            {seasons.length === 0 && (
                <EmptyState icon="🎄" title="No seasons yet" text="Start with Cratemas, or pick another look below."
                    action={<Button variant="primary" onClick={() => add('christmas', legacyCratemasKeys(categories as any))}>Set up Cratemas</Button>} />
            )}

            {seasons.map(s => (
                <Card key={s.id}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div><p className="text-xs font-bold text-[#8A8A96] mb-1">Name</p><input className={inputClass} value={s.name} onChange={e => change(s.id, { name: e.target.value })} /></div>
                        <div><p className="text-xs font-bold text-[#8A8A96] mb-1">Look</p>
                            <select className={inputClass} value={s.theme} onChange={e => change(s.id, { theme: e.target.value as SeasonTheme })}>
                                {(Object.keys(THEME_LABELS) as SeasonTheme[]).map(t => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
                            </select></div>
                        <div className="md:col-span-2"><p className="text-xs font-bold text-[#8A8A96] mb-1">Short line under the name</p><input className={inputClass} value={s.tagline || ''} onChange={e => change(s.id, { tagline: e.target.value })} /></div>
                        <DateParts label="Starts every year on" value={s.start} onChange={v => change(s.id, { start: v })} />
                        <DateParts label="Ends every year on" value={s.end} onChange={v => change(s.id, { end: v })} />
                        <div><p className="text-xs font-bold text-[#8A8A96] mb-1">Showing</p>
                            <select className={inputClass} value={s.mode} onChange={e => change(s.id, { mode: e.target.value as Season['mode'] })}>
                                <option value="auto">Follow the dates</option><option value="on">Show it now</option><option value="off">Hidden</option>
                            </select></div>
                        <div><p className="text-xs font-bold text-[#8A8A96] mb-1">Films ({s.movieKeys.length})</p>
                            <Button onClick={() => setPicking(s.id)}>Choose films</Button></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 items-center">
                        <a className="text-sm font-bold text-white/80 underline" href={`/cratemas?season=${encodeURIComponent(s.id)}`} target="_blank" rel="noreferrer">Preview page</a>
                        <span className="flex-1" />
                        <Button variant="danger" size="sm" onClick={() => remove(s.id)}>Remove</Button>
                    </div>
                    {picking === s.id && (
                        <MovieSelectorModal allMovies={allMovies} initialSelectedKeys={s.movieKeys} title={`Films for ${s.name}`}
                            onSave={keys => { change(s.id, { movieKeys: keys }); setPicking(null); }} onClose={() => setPicking(null)} />
                    )}
                </Card>
            ))}

            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-[#8A8A96]">Add:</span>
                {(Object.keys(THEME_LABELS) as SeasonTheme[]).filter(t => t !== 'generic').map(t => <Button key={t} size="sm" onClick={() => add(t)}>{THEME_LABELS[t]}</Button>)}
                <span className="flex-1" />
                <Button variant="primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save seasons'}</Button>
            </div>
        </div>
    );
};
export default SeasonsManager;
