import React, { useEffect, useRef, useState } from 'react';
import { Movie } from '../../types';
import { Button, Card, adminPost } from './ui';
import { ShareKind, shareWording, wrapLines } from '../../api/_lib/shareCopy';
import { clipStart, formatTimecode, isPlainVideoUrl, parseTimecode, pickRecorderType } from '../../api/_lib/shareVideo';
import { FONT, GOLD, RED, SERIF, spaced } from './shareCanvas';

// "Make a video": a short piece of the film's trailer (or of the film itself), set inside the same premium frame as the picture
// (badge, title, date, price, Crate TV). Recorded in the browser — nothing is uploaded or stored.
const W = 1080, H = 1920;
// Story/Reel screens hide roughly the top and bottom 250px behind Instagram's own buttons, so the words sit inside that.
const VX = 60, VY = 350, VW = 960, VH = 720; // where the trailer plays

/** Everything except the moving picture: background, frame, words. Drawn once, reused for every frame. */
function drawFrameLayer(c: CanvasRenderingContext2D, film: Movie, kind: ShareKind) {
    const wording = shareWording(film, kind);
    const accent = kind === 'premiere' ? GOLD : RED;
    const rgb = kind === 'premiere' ? '201,164,92' : '229,48,79';
    c.fillStyle = '#0A0A0C'; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, W * 0.95);
    g.addColorStop(0, `rgba(${rgb},0.20)`); g.addColorStop(1, 'rgba(10,10,12,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = `rgba(${rgb},0.6)`; c.lineWidth = 2; c.strokeRect(36, 36, W - 72, H - 72);

    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = accent; c.font = `700 28px ${FONT}`; spaced(c, wording.badge, W / 2, 290, 9);

    c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 50; c.shadowOffsetY = 20;
    c.fillStyle = '#17171c'; c.fillRect(VX, VY, VW, VH); c.restore();

    let y = VY + VH + 130;
    c.fillStyle = '#fff'; c.font = `700 76px ${SERIF}`;
    wrapLines(film.title || '', W - 200, t => c.measureText(t).width, 2).forEach(l => { c.fillText(l, W / 2, y); y += 82; });
    if (film.director) { c.fillStyle = 'rgba(255,255,255,0.72)'; c.font = `500 28px ${FONT}`; spaced(c, `DIRECTED BY ${film.director.toUpperCase()}`, W / 2, y, 3); y += 34; }
    if (wording.when) { y += 22; c.fillStyle = accent; c.font = `700 38px ${FONT}`; c.fillText(wording.when, W / 2, y); y += 46; }
    if (wording.price) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = `500 30px ${FONT}`; c.fillText(wording.price, W / 2, y); y += 34; }
    y += 24; c.fillStyle = accent; c.fillRect(W / 2 - 40, y, 80, 2);

    c.fillStyle = '#fff'; c.font = `800 34px ${FONT}`; spaced(c, 'CRATE TV', W / 2, H - 270, 10);
    c.fillStyle = accent; c.font = `600 24px ${FONT}`; c.fillText(wording.cta, W / 2, H - 236);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = `500 22px ${FONT}`; c.fillText('cratetv.net · link in bio', W / 2, H - 204);
}

const LENGTHS = [8, 10, 15] as const;
type Source = 'trailer' | 'film';
const FILM_START_DEFAULT = 60; // past the opening titles

const waitFor = (target: HTMLVideoElement, event: string, ms: number) => new Promise<boolean>(resolve => {
    const done = (ok: boolean) => { clearTimeout(timer); target.removeEventListener(event, onEvent); resolve(ok); };
    const onEvent = () => done(true);
    const timer = setTimeout(() => done(false), ms);
    target.addEventListener(event, onEvent, { once: true });
});

/** Streaming films (HLS) need hls.js in most browsers; the same pinned copy the film pages use. */
const loadHls = () => new Promise<any>(resolve => {
    const w = window as any;
    if (w.Hls) return resolve(w.Hls);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
    script.onload = () => resolve(w.Hls);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
});

const ShareVideoMaker: React.FC<{ film: Movie; kind: ShareKind }> = ({ film, kind }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hasTrailer = isPlainVideoUrl(film.trailer);
    const [len, setLen] = useState<number>(10);
    const [source, setSource] = useState<Source>(hasTrailer ? 'trailer' : 'film');
    const [startText, setStartText] = useState(formatTimecode(FILM_START_DEFAULT));
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<{ url: string; ext: string } | null>(null);
    const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

    // A new film or style means the old video no longer matches.
    useEffect(() => () => { if (done) URL.revokeObjectURL(done.url); }, [done]);
    useEffect(() => { setDone(null); setMsg(null); setSource(isPlainVideoUrl(film.trailer) ? 'trailer' : 'film'); }, [film.key, kind]);

    const [dl, setDl] = useState<'idle' | 'busy'>('idle');
    const downloadFilm = async () => {
        setMsg(null); setDl('busy');
        try {
            const r = await adminPost<{ url: string }>('/api/admin-clip-source', { movieKey: film.key, download: true });
            window.location.href = r.url; // the link tells the browser to save the file
            setMsg({ tone: 'good', text: 'Your download is starting. A full film is a big file, so give it a minute.' });
        } catch (e) {
            setMsg({ tone: 'bad', text: (e as Error).message || "Couldn't get the film's file." });
        } finally { setDl('idle'); }
    };

    const make = async () => {
        setMsg(null); setDone(null);
        const rec = pickRecorderType(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
        const canvas = canvasRef.current;
        if (!rec || !canvas || !(canvas as any).captureStream) return setMsg({ tone: 'bad', text: "This browser can't record video. Try Chrome on a computer." });

        // Where the pictures come from.
        let src = film.trailer, isHls = false, start = film.trailerStart || 0;
        if (source === 'film') {
            const t = parseTimecode(startText);
            if (t === null) return setMsg({ tone: 'bad', text: 'Type the start like 12:30 (minutes:seconds).' });
            start = t;
            try {
                const r = await adminPost<{ url: string; hls: boolean }>('/api/admin-clip-source', { movieKey: film.key });
                src = r.url; isHls = r.hls;
            } catch (e) {
                return setMsg({ tone: 'bad', text: (e as Error).message || "Couldn't get the film's file." });
            }
        } else if (!isPlainVideoUrl(film.trailer)) {
            return setMsg({ tone: 'bad', text: "This film doesn't have a trailer file I can use. Choose \"From the film\" instead." });
        }

        setBusy(true);
        let actx: AudioContext | null = null;
        let hls: any = null;
        const v = document.createElement('video');
        try {
            v.crossOrigin = 'anonymous'; v.playsInline = true; v.preload = 'auto';
            if (isHls && !v.canPlayType('application/vnd.apple.mpegurl')) {
                const Hls = await loadHls();
                if (!Hls?.isSupported()) throw new Error('hls');
                hls = new Hls({ maxBufferLength: 20, startPosition: start });
                hls.loadSource(src); hls.attachMedia(v);
            } else {
                v.src = src;
            }
            const meta = await new Promise<boolean>(res => {
                v.onloadedmetadata = () => res(true); v.onerror = () => res(false); setTimeout(() => res(false), 30000);
            });
            if (!meta) throw new Error(isHls ? 'hls' : 'cors');
            v.currentTime = clipStart(start, v.duration, len);
            await waitFor(v, 'seeked', 8000);
            for (let i = 0; i < 40 && v.readyState < 2; i++) await new Promise(r => setTimeout(r, 200));

            canvas.width = W; canvas.height = H;
            const c = canvas.getContext('2d')!;
            const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
            drawFrameLayer(layer.getContext('2d')!, film, kind);
            const accent = kind === 'premiere' ? GOLD : RED;
            const paint = (progress: number) => {
                c.drawImage(layer, 0, 0);
                c.save(); c.beginPath(); c.rect(VX, VY, VW, VH); c.clip();
                const sc = Math.max(VW / v.videoWidth, VH / v.videoHeight);
                c.drawImage(v, VX + (VW - v.videoWidth * sc) / 2, VY + (VH - v.videoHeight * sc) / 2, v.videoWidth * sc, v.videoHeight * sc);
                c.restore();
                c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(VX, VY + VH + 14, VW, 3);
                c.fillStyle = accent; c.fillRect(VX, VY + VH + 14, VW * Math.min(1, progress), 3);
            };
            paint(0);
            try { c.getImageData(0, 0, 1, 1); } catch { throw new Error('cors'); } // picture is "locked" by the storage settings

            const AC = window.AudioContext || (window as any).webkitAudioContext;
            const stream = (canvas as any).captureStream(30) as MediaStream;
            if (AC) {
                actx = new AC();
                const dest = actx!.createMediaStreamDestination();
                actx!.createMediaElementSource(v).connect(dest); // sound goes into the recording, not the speakers
                dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
            }
            const recorder = new MediaRecorder(stream, { mimeType: rec.mime, videoBitsPerSecond: 6_000_000 });
            const chunks: Blob[] = [];
            recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
            const stopped = new Promise<void>(res => { recorder.onstop = () => res(); });
            recorder.start(250);
            await v.play();
            const t0 = performance.now();
            const tick = () => {
                const el = (performance.now() - t0) / 1000;
                paint(el / len);
                if (el >= len || v.ended) { recorder.stop(); v.pause(); return; }
                requestAnimationFrame(tick);
            };
            tick();
            await stopped;
            // Go by what the browser really recorded, not what we asked for.
            const real = (recorder.mimeType || rec.mime).toLowerCase();
            const ext = real.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(chunks, { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' });
            setDone({ url: URL.createObjectURL(blob), ext });
            setMsg({ tone: 'good', text: ext === 'mp4' ? 'Your video is ready.' : "Your video is ready. It's a WebM file — if Instagram won't take it, tell me and I'll add a converter." });
        } catch (e) {
            const why = (e as Error)?.message;
            setMsg({ tone: 'bad', text: why === 'cors'
                ? "Your browser won't let me copy this video from storage (a permission on the video storage). Tell me and I'll fix it."
                : why === 'hls'
                    ? "This film is a streaming-format file and this browser couldn't open it. Try Chrome on a computer."
                    : 'The video could not be made. Try again, or try another film.' });
        } finally {
            try { hls?.destroy(); v.pause(); v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
            try { await actx?.close(); } catch { /* ignore */ }
            setBusy(false);
        }
    };

    const name = `${(film.title || 'film').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-clip.${done?.ext || 'mp4'}`;
    const chip = (on: boolean, off?: boolean) => `rounded-full px-4 py-2 text-sm font-bold border ${on ? 'bg-white text-black border-white' : 'bg-[#131318] text-[#A1A1AD] border-white/[0.07]'} ${off ? 'opacity-40 cursor-not-allowed' : ''}`;
    return (
        <Card>
            <p className="text-xs font-bold text-[#8A8A96] mb-2">SHORT VIDEO (STORY / REEL)</p>
            <p className="text-sm text-white/80 mb-3">A clip inside the same frame, with the title{kind === 'premiere' ? ', date and price' : ''}.</p>
            <div className="flex gap-2 flex-wrap items-center mb-3">
                <span className="text-xs font-bold text-[#8A8A96]">FROM</span>
                <button disabled={busy || !hasTrailer} onClick={() => setSource('trailer')} className={chip(source === 'trailer', !hasTrailer)}>The trailer</button>
                <button disabled={busy} onClick={() => setSource('film')} className={chip(source === 'film')}>The film</button>
                {!hasTrailer && <span className="text-xs text-[#8A8A96]">No trailer file for this film.</span>}
            </div>
            {source === 'film' && (
                <div className="flex gap-2 flex-wrap items-center mb-3">
                    <label className="text-xs font-bold text-[#8A8A96]" htmlFor="clip-start">START AT</label>
                    <input id="clip-start" value={startText} onChange={e => setStartText(e.target.value)} disabled={busy} placeholder="1:00"
                        className="w-24 rounded-xl bg-[#131318] border border-white/[0.07] px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
                    <span className="text-xs text-[#8A8A96]">minutes:seconds into the film. Pick a good moment, past the opening titles.</span>
                </div>
            )}
            <div className="flex gap-2 flex-wrap items-center mb-3">
                {LENGTHS.map(n => (
                    <button key={n} disabled={busy} onClick={() => setLen(n)} className={chip(len === n)}>{n} sec</button>
                ))}
                <Button variant="primary" accent="magenta" onClick={make} disabled={busy}>{busy ? `Recording… ${len}s, please wait` : '🎬 Make video'}</Button>
            </div>
            <div className="flex gap-2 flex-wrap items-center mb-3 pt-3 border-t border-white/[0.07]">
                <Button onClick={downloadFilm} disabled={busy || dl === 'busy'}>{dl === 'busy' ? 'Getting the file…' : '⬇ Download the full film'}</Button>
                <span className="text-xs text-[#8A8A96]">Saves the whole film to your computer so you can cut a trailer in your editor.</span>
            </div>
            {msg && <p className={`text-sm mb-3 ${msg.tone === 'good' ? 'text-emerald-300' : 'text-amber-300'}`}>{msg.text}</p>}
            <canvas ref={canvasRef} className={`rounded-xl border border-white/10 ${busy ? 'w-48' : 'hidden'}`} style={{ aspectRatio: `${W} / ${H}` }} />
            {done && (
                <div className="space-y-3">
                    <video src={done.url} controls playsInline className="w-48 rounded-xl border border-white/10" style={{ aspectRatio: `${W} / ${H}` }} />
                    <a href={done.url} download={name} className="inline-block rounded-xl bg-white text-black font-bold text-sm px-4 py-2">⬇ Download video</a>
                </div>
            )}
        </Card>
    );
};
export default ShareVideoMaker;
