import React, { useEffect, useRef, useState } from 'react';
import { uploadAndConvert, videoApi, type JobStatus } from '../../services/videoUpload';

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
const jobStoreKey = (movieKey: string) => `crate-video-job:${movieKey}`;
const api = videoApi;

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
                const r = await api<JobStatus>({ action: 'status', jobId: jobRef.current });
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
        try {
            const jobId = await uploadAndConvert(file, movieKey, title, (pct, sent) => {
                setProgress(pct);
                setMessage(pct >= 100 ? 'Starting the conversion…' : `Uploading… ${pct}% (${(sent / 1024 ** 3).toFixed(2)} of ${(file.size / 1024 ** 3).toFixed(2)} GB). Keep this page open.`);
            });
            jobRef.current = jobId;
            try { localStorage.setItem(jobStoreKey(movieKey), jobId); } catch { /* none */ }
            setProgress(0);
            setStage('converting');
        } catch (e) {
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
