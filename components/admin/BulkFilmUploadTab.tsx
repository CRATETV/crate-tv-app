import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Movie } from '../../types';
import { Button, Card, Notice, PageHeader, Pill } from './ui';
import { guessFilm } from '../../api/_lib/filmFileMatch';
import { uploadAndConvert, videoApi, type JobStatus } from '../../services/videoUpload';

// Admin → Bulk upload films (Oct 2026). Drop many film files at once (a whole
// festival); each one is matched to its film by name, uploaded one after the
// other, and converted for streaming by AWS. When a conversion finishes, the
// film's video address and runtime fill in by themselves (the server does it,
// so the page can be closed once uploads are done). Originals are deleted
// 7 days after conversion, like the single-film box.
// Anyone on the team with this tab can use it; no Terminal needed.

interface Row {
    id: string;
    file: File | null;          // null for conversions restored after a refresh
    fileName: string;
    size: number;
    movieKey: string;
    guessed: boolean;
    state: 'ready' | 'waiting' | 'uploading' | 'converting' | 'done' | 'error';
    pct: number;
    note: string;
    jobId?: string;
}

const STORE = 'crate-bulk-video-jobs';
const POLL_MS = 20_000;
const GB = 1024 ** 3;
const fmtSize = (b: number) => b >= GB ? `${(b / GB).toFixed(2)} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`;
const isVideo = (f: File) => f.type.startsWith('video/') || /\.(mov|mp4|m4v|mxf|mkv|avi)$/i.test(f.name);

type Saved = { jobId: string; movieKey: string; fileName: string; size: number };
const loadSaved = (): Saved[] => { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } };
const writeSaved = (list: Saved[]) => { try { localStorage.setItem(STORE, JSON.stringify(list)); } catch { /* none */ } };

const BulkFilmUploadTab: React.FC<{ movies: Record<string, Movie>; onRefresh: () => void }> = ({ movies, onRefresh }) => {
    const films = useMemo(() => Object.values(movies)
        .filter(m => m && m.key && m.title)
        .sort((a, b) => a.title.localeCompare(b.title)), [movies]);
    const choices = useMemo(() => films.map(m => ({ key: m.key, title: m.title, director: m.director })), [films]);

    const [rows, setRows] = useState<Row[]>(() => loadSaved().map(s => ({
        id: s.jobId, file: null, fileName: s.fileName, size: s.size, movieKey: s.movieKey, guessed: false,
        state: 'converting', pct: 0, note: 'Converting…', jobId: s.jobId,
    })));
    const [running, setRunning] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    const patch = (id: string, p: Partial<Row>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...p } : r));

    const addFiles = (list: FileList | File[] | null) => {
        const files = Array.from(list || []).filter(isVideo);
        if (!files.length) return;
        setRows(rs => {
            const have = new Set(rs.filter(r => r.file).map(r => `${r.fileName}:${r.size}`));
            const fresh = files.filter(f => !have.has(`${f.name}:${f.size}`)).map(f => {
                const key = guessFilm(f.name, choices) || '';
                return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, fileName: f.name, size: f.size, movieKey: key, guessed: !!key, state: 'ready' as const, pct: 0, note: '' };
            });
            return [...rs, ...fresh];
        });
    };

    // Two files pointing at the same film.
    const dupes = useMemo(() => {
        const count: Record<string, number> = {};
        rows.filter(r => r.state === 'ready' && r.movieKey).forEach(r => { count[r.movieKey] = (count[r.movieKey] || 0) + 1; });
        return new Set(Object.keys(count).filter(k => count[k] > 1));
    }, [rows]);

    const ready = rows.filter(r => r.state === 'ready' || (r.state === 'error' && r.file));
    const toSend = ready.filter(r => r.movieKey && !dupes.has(r.movieKey));
    const noFilm = ready.filter(r => !r.movieKey).length;
    const sendBytes = toSend.reduce((s, r) => s + r.size, 0);

    // Warn before leaving while uploading.
    useEffect(() => {
        if (!running) return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [running]);

    const startAll = async () => {
        const queue = toSend.map(r => r.id);
        if (!queue.length) return;
        setRunning(true);
        setRows(rs => rs.map(r => queue.includes(r.id) ? { ...r, state: 'waiting', pct: 0, note: 'Waiting its turn…' } : r));
        for (const id of queue) {
            const row = rowsRef.current.find(r => r.id === id);
            if (!row || !row.file) continue;
            const film = movies[row.movieKey];
            patch(id, { state: 'uploading', note: 'Starting upload…' });
            try {
                const jobId = await uploadAndConvert(row.file, row.movieKey, film?.title || row.fileName, (pct, sent) => {
                    patch(id, { pct, note: pct >= 100 ? 'Starting the conversion…' : `Uploading… ${pct}% (${fmtSize(sent)} of ${fmtSize(row.size)})` });
                });
                writeSaved([...loadSaved().filter(s => s.movieKey !== row.movieKey), { jobId, movieKey: row.movieKey, fileName: row.fileName, size: row.size }]);
                // So the film's own editor shows the conversion too.
                try { localStorage.setItem(`crate-video-job:${row.movieKey}`, jobId); } catch { /* none */ }
                patch(id, { state: 'converting', jobId, pct: 0, note: 'Converting… (starting)' });
            } catch (e) {
                patch(id, { state: 'error', pct: 0, note: (e as Error).message || 'Upload failed.' });
            }
        }
        setRunning(false);
    };

    // Check on every conversion together.
    const converting = rows.filter(r => r.state === 'converting' && r.jobId).map(r => r.jobId!).join(',');
    useEffect(() => {
        if (!converting) return;
        let stopped = false;
        const check = async () => {
            try {
                const { jobs } = await videoApi<{ jobs: Record<string, JobStatus> }>({ action: 'statuses', jobIds: converting.split(',') });
                if (stopped) return;
                setRows(rs => rs.map(r => {
                    const j = r.jobId ? jobs[r.jobId] : undefined;
                    if (!j || r.state !== 'converting') return r;
                    if (j.status === 'COMPLETE') {
                        return { ...r, state: 'done', pct: 100, note: j.appliedToFilm === false
                            ? 'Converted. The film wasn\'t saved yet, so open it and paste the address in.'
                            : `Ready${j.minutes ? ` (${j.minutes} min)` : ''}: the film now plays the streaming version.` };
                    }
                    if (j.status === 'ERROR' || j.status === 'CANCELED' || (j.status === 'UNKNOWN' && j.error)) {
                        return { ...r, state: 'error', pct: 0, note: j.error || 'The conversion failed.' };
                    }
                    return { ...r, pct: j.percent ?? 0, note: `Converting… ${j.percent != null ? `${j.percent}%` : '(starting)'}` };
                }));
                const doneIds = Object.entries(jobs).filter(([, j]) => ['COMPLETE', 'ERROR', 'CANCELED'].includes(j.status) || (j.status === 'UNKNOWN' && j.error)).map(([id]) => id);
                if (doneIds.length) {
                    const saved = loadSaved();
                    saved.filter(s => doneIds.includes(s.jobId)).forEach(s => {
                        try { if (localStorage.getItem(`crate-video-job:${s.movieKey}`) === s.jobId) localStorage.removeItem(`crate-video-job:${s.movieKey}`); } catch { /* none */ }
                    });
                    writeSaved(saved.filter(s => !doneIds.includes(s.jobId)));
                    // Reload the film list so nobody saves an old video address over the new one.
                    onRefreshRef.current();
                }
            } catch { /* try again next time */ }
        };
        check();
        const t = setInterval(check, POLL_MS);
        return () => { stopped = true; clearInterval(t); };
    }, [converting]);

    const clearFinished = () => setRows(rs => rs.filter(r => r.state !== 'done' && !(r.state === 'error' && !r.file)));
    const remove = (id: string) => setRows(rs => rs.filter(r => r.id !== id));

    return (
        <div className="space-y-6">
            <PageHeader title="Bulk upload films" accent="orange"
                subtitle="Upload many films at once, like a whole festival. Each one is converted for streaming and its video fills in by itself." />

            <Card>
                <ol className="text-sm text-[#A1A1AD] space-y-1.5 list-decimal pl-5">
                    <li>First, add each film in <strong className="text-white">Films</strong> (title, poster, festival) and press Save. Leave the video empty.</li>
                    <li>Drop all the film files below. CRATE guesses which film each file is; check every guess.</li>
                    <li>Press <strong className="text-white">Upload &amp; convert</strong>. Keep this page open while files upload. After that you can close it: each film updates by itself when AWS is done.</li>
                </ol>
                <p className="text-xs text-[#8A8A96] mt-3">Original files are deleted automatically 7 days after they're converted. Posters and photos still go in each film's page as usual.</p>
            </Card>

            {!running && (
                <label
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                    className={`block cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${dragOver ? 'border-orange-400 bg-orange-500/[0.06]' : 'border-white/15 hover:border-white/30'}`}>
                    <input type="file" multiple accept="video/*,.mov,.mp4,.mxf,.mkv,.m4v" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                    <p className="text-3xl mb-2">📤</p>
                    <p className="text-white font-bold">Drop film files here, or click to choose</p>
                    <p className="text-xs text-[#8A8A96] mt-1">.mov, .mp4, .mxf… any size. You can pick many at once.</p>
                </label>
            )}

            {rows.length > 0 && (
                <Card padded={false}>
                    <div className="divide-y divide-white/[0.06]">
                        {rows.map(r => {
                            const film = r.movieKey ? movies[r.movieKey] : undefined;
                            const editable = !running && (r.state === 'ready' || (r.state === 'error' && !!r.file));
                            const replaces = film?.fullMovie && /\.m3u8(\?|$)/i.test(film.fullMovie);
                            return (
                                <div key={r.id} className="px-4 py-3 space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white font-semibold truncate" title={r.fileName}>{r.fileName}</p>
                                            <p className="text-xs text-[#8A8A96]">{fmtSize(r.size)}</p>
                                        </div>
                                        {editable ? (
                                            <select value={r.movieKey} onChange={e => patch(r.id, { movieKey: e.target.value, guessed: false })}
                                                className="bg-[#0B0B0D] border border-white/10 rounded-xl px-3 py-2 text-white text-sm max-w-[18rem]">
                                                <option value="">Choose the film…</option>
                                                {films.map(m => <option key={m.key} value={m.key}>{m.title}{m.isUnlisted ? ' (hidden)' : ''}{m.director ? ` · ${m.director}` : ''}</option>)}
                                            </select>
                                        ) : (
                                            <span className="text-sm text-white max-w-[18rem] truncate">{film?.title || '—'}</span>
                                        )}
                                        {editable && r.guessed && <Pill accent="sky">guessed</Pill>}
                                        {r.state === 'done' && <Pill accent="green" solid>✓ Ready</Pill>}
                                        {r.state === 'error' && <Pill accent="coral" solid>Failed</Pill>}
                                        {editable && <button onClick={() => remove(r.id)} className="text-[#8A8A96] hover:text-white px-2" title="Remove">✕</button>}
                                    </div>
                                    {editable && !r.movieKey && <p className="text-xs text-amber-300">Choose which film this is, or remove it.</p>}
                                    {editable && r.movieKey && dupes.has(r.movieKey) && <p className="text-xs text-red-400">Two files are set to this film. Pick a different film for one of them, or remove one.</p>}
                                    {editable && replaces && <p className="text-xs text-amber-300">This film already has a streaming version. Uploading replaces it.</p>}
                                    {['waiting', 'uploading', 'converting'].includes(r.state) && (
                                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                            <div className={`h-1.5 rounded-full transition-all ${r.state === 'converting' ? 'bg-sky-500' : 'bg-orange-500'}`} style={{ width: `${r.pct}%` }} />
                                        </div>
                                    )}
                                    {r.note && <p className={`text-xs ${r.state === 'error' ? 'text-red-400' : r.state === 'done' ? 'text-emerald-400' : 'text-[#A1A1AD]'}`}>{r.note}</p>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 p-4 border-t border-white/[0.06]">
                        <p className="text-xs text-[#8A8A96] flex-1">
                            {running ? 'Uploading one film at a time. Keep this page open until every film says Converting.'
                                : toSend.length ? `${toSend.length} film${toSend.length === 1 ? '' : 's'} ready (${fmtSize(sendBytes)}).${noFilm ? ` ${noFilm} without a film will be skipped.` : ''}`
                                : 'Nothing ready to upload.'}
                        </p>
                        {!running && rows.some(r => r.state === 'done' || (r.state === 'error' && !r.file)) && <Button size="sm" variant="ghost" onClick={clearFinished}>Clear finished</Button>}
                        <Button variant="primary" accent="orange" disabled={running || toSend.length === 0} onClick={startAll}>
                            {running ? 'Uploading…' : `Upload & convert ${toSend.length || ''}`}
                        </Button>
                    </div>
                </Card>
            )}

            {rows.some(r => r.state === 'converting') && !running && (
                <Notice tone="info">Conversions keep going on AWS even if you close this page. Each film updates by itself when it's done.</Notice>
            )}
        </div>
    );
};

export default BulkFilmUploadTab;
