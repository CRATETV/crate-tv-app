import React, { useEffect, useRef, useState } from 'react';

// "Upload & convert film" in the Film editor (Oct 2026). Uploads the original
// film to S3 in pieces (big films are many GB), then AWS MediaConvert makes
// the streaming version (same as ops/video/convert-film.sh). When it's ready
// the film's video address and runtime fill themselves in.
// Server side: api/admin-video.ts.

interface Props {
    movieKey: string;
    title: string;
    /** Called when the streaming version is ready: put it in the form. */
    onReady: (masterUrl: string, minutes: number | null) => void;
}

type Stage = 'idle' | 'uploading' | 'converting' | 'done' | 'error';
const PARALLEL = 4;
const jobStoreKey = (movieKey: string) => `crate-video-job:${movieKey}`;

async function api<T = any>(body: Record<string, unknown>): Promise<T> {
    let password = '';
    try { password = sessionStorage.getItem('adminPassword') || ''; } catch { /* no storage */ }
    const res = await fetch('/api/admin-video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data as T;
}

const FilmUploadConvert: React.FC<Props> = ({ movieKey, title, onReady }) => {
    const [stage, setStage] = useState<Stage>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [setupProblems, setSetupProblems] = useState<string[] | null>(null);
    const jobRef = useRef<string | null>(null);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;

    // Resume a conversion started earlier for this film (e.g. after a refresh).
    useEffect(() => {
        let saved: string | null = null;
        try { saved = localStorage.getItem(jobStoreKey(movieKey)); } catch { /* none */ }
        if (saved) { jobRef.current = saved; setStage('converting'); setMessage('Converting for streaming…'); }
    }, [movieKey]);

    // Keep the page open while uploading.
    useEffect(() => {
        if (stage !== 'uploading') return;
        const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [stage]);

    // Check on the conversion every 15 seconds.
    useEffect(() => {
        if (stage !== 'converting' || !jobRef.current) return;
        let stopped = false;
        const check = async () => {
            try {
                const r = await api<{ status: string; percent: number | null; masterUrl: string | null; minutes: number | null; error: string | null }>({ action: 'status', jobId: jobRef.current });
                if (stopped) return;
                if (r.status === 'COMPLETE' && r.masterUrl) {
                    try { localStorage.removeItem(jobStoreKey(movieKey)); } catch { /* none */ }
                    setStage('done');
                    setMessage(`Ready! The film now plays the streaming version${r.minutes ? ` (${r.minutes} min)` : ''}. Press Save to keep it.`);
                    onReadyRef.current(r.masterUrl, r.minutes);
                } else if (r.status === 'ERROR' || r.status === 'CANCELED') {
                    try { localStorage.removeItem(jobStoreKey(movieKey)); } catch { /* none */ }
                    setStage('error');
                    setMessage(r.error || 'The conversion failed.');
                } else {
                    setProgress(r.percent ?? 0);
                    setMessage(`Converting for streaming… ${r.percent != null ? `${r.percent}%` : '(starting)'}. You can close this page; it carries on, and the film updates by itself when it's done.`);
                }
            } catch (e) {
                if (!stopped) setMessage(`Still converting (couldn't check just now: ${(e as Error).message}).`);
            }
        };
        check();
        const t = setInterval(check, 15000);
        return () => { stopped = true; clearInterval(t); };
    }, [stage, movieKey]);

    const checkSetup = async () => {
        try { const r = await api<{ ready: boolean; problems: string[] }>({ action: 'setup' }); setSetupProblems(r.problems); }
        catch (e) { setSetupProblems([(e as Error).message]); }
    };

    const start = async () => {
        if (!file) return;
        setStage('uploading'); setProgress(0); setMessage('Starting upload…');
        let key = '', uploadId = '';
        try {
            const s = await api<{ key: string; uploadId: string; partSize: number; parts: number }>({ action: 'start-upload', fileName: file.name, contentType: file.type, size: file.size });
            key = s.key; uploadId = s.uploadId;
            const total = s.parts;
            const done: { PartNumber: number; ETag: string }[] = [];
            const loaded = new Array(total + 1).fill(0);
            const report = () => {
                const sum = loaded.reduce((a, b) => a + b, 0);
                const pct = Math.min(99, Math.floor((sum / file.size) * 100));
                setProgress(pct);
                setMessage(`Uploading… ${pct}% (${(sum / 1024 ** 3).toFixed(2)} of ${(file.size / 1024 ** 3).toFixed(2)} GB). Keep this page open.`);
            };
            const putPart = (url: string, blob: Blob, n: number) => new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', url, true);
                xhr.upload.onprogress = ev => { loaded[n] = ev.loaded; report(); };
                xhr.onload = () => {
                    if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(`piece ${n} failed (${xhr.status})`));
                    const etag = xhr.getResponseHeader('ETag');
                    if (!etag) return reject(new Error('S3 needs one setting first: in the bucket\'s CORS, add "ETag" to ExposeHeaders (see setup steps).'));
                    resolve(etag);
                };
                xhr.onerror = () => reject(new Error(`piece ${n}: connection problem`));
                xhr.send(blob);
            });

            for (let first = 1; first <= total; first += 40) {
                const nums = Array.from({ length: Math.min(40, total - first + 1) }, (_, i) => first + i);
                const { urls } = await api<{ urls: Record<number, string> }>({ action: 'sign-parts', key, uploadId, partNumbers: nums });
                let idx = 0;
                const worker = async () => {
                    while (idx < nums.length) {
                        const n = nums[idx++];
                        const blob = file.slice((n - 1) * s.partSize, Math.min(file.size, n * s.partSize));
                        let lastErr: unknown;
                        for (let attempt = 0; attempt < 3; attempt++) {
                            try { const etag = await putPart(urls[n], blob, n); done.push({ PartNumber: n, ETag: etag }); lastErr = null; break; }
                            catch (e) { lastErr = e; loaded[n] = 0; if (/ETag/.test((e as Error).message)) break; await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); }
                        }
                        if (lastErr) throw lastErr;
                        loaded[n] = blob.size; report();
                    }
                };
                await Promise.all(Array.from({ length: Math.min(PARALLEL, nums.length) }, worker));
            }
            setMessage('Finishing upload…');
            await api({ action: 'complete-upload', key, uploadId, parts: done });
            setMessage('Starting the conversion…');
            const c = await api<{ jobId: string }>({ action: 'convert', key, movieKey, title });
            jobRef.current = c.jobId;
            try { localStorage.setItem(jobStoreKey(movieKey), c.jobId); } catch { /* none */ }
            setProgress(0);
            setStage('converting');
        } catch (e) {
            if (key && uploadId) api({ action: 'abort-upload', key, uploadId }).catch(() => {});
            setStage('error');
            setMessage((e as Error).message || 'Upload failed.');
        }
    };

    const busy = stage === 'uploading' || stage === 'converting';
    return (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Upload &amp; convert film</p>
                <button type="button" onClick={checkSetup} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white">Check setup</button>
            </div>
            <p className="text-xs text-gray-400">Choose the film file (any size). It uploads to S3, AWS makes the streaming version (1080p / 720p / 360p), and the video address and runtime fill in by themselves. The original is deleted automatically 7 days after it's converted.</p>
            {setupProblems && (setupProblems.length === 0
                ? <p className="text-xs text-emerald-400">✓ AWS is set up for converting.</p>
                : <ul className="text-xs text-amber-300 space-y-1">{setupProblems.map(p => <li key={p}>• {p}</li>)}</ul>)}
            {!busy && (
                <div className="flex flex-wrap items-center gap-2">
                    <input type="file" accept="video/*,.mov,.mp4,.mxf,.mkv,.m4v" onChange={e => { setFile(e.target.files?.[0] || null); setStage('idle'); setMessage(''); }}
                        className="text-xs text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white" />
                    <button type="button" disabled={!file} onClick={start}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl">
                        Upload &amp; convert
                    </button>
                </div>
            )}
            {(busy || stage === 'done') && (
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all ${stage === 'converting' ? 'bg-sky-500' : 'bg-emerald-500'}`} style={{ width: `${stage === 'done' ? 100 : progress}%` }} />
                </div>
            )}
            {message && <p className={`text-xs ${stage === 'error' ? 'text-red-400' : stage === 'done' ? 'text-emerald-400' : 'text-gray-300'}`}>{message}</p>}
        </div>
    );
};

export default FilmUploadConvert;
