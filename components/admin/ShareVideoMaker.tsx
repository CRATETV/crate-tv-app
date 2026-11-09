import React, { useEffect, useRef, useState } from 'react';
import { Movie } from '../../types';
import { Button, Card } from './ui';
import { ShareKind, shareWording, wrapLines } from '../../api/_lib/shareCopy';
import { clipStart, isPlainVideoUrl, pickRecorderType } from '../../api/_lib/shareVideo';
import { FONT, GOLD, RED, SERIF, spaced } from './shareCanvas';

// "Make a video": a short piece of the film's trailer, set inside the same premium frame as the picture
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

const ShareVideoMaker: React.FC<{ film: Movie; kind: ShareKind }> = ({ film, kind }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [len, setLen] = useState<number>(10);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<{ url: string; ext: string } | null>(null);
    const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

    // A new film or style means the old video no longer matches.
    useEffect(() => () => { if (done) URL.revokeObjectURL(done.url); }, [done]);
    useEffect(() => { setDone(null); setMsg(null); }, [film.key, kind]);

    const make = async () => {
        setMsg(null); setDone(null);
        if (!isPlainVideoUrl(film.trailer)) return setMsg({ tone: 'bad', text: "This film doesn't have a trailer file I can use (it's missing, or it's a YouTube/Vimeo link)." });
        const rec = pickRecorderType(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
        const canvas = canvasRef.current;
        if (!rec || !canvas || !(canvas as any).captureStream) return setMsg({ tone: 'bad', text: "This browser can't record video. Try Chrome on a computer." });
        setBusy(true);
        let actx: AudioContext | null = null;
        const v = document.createElement('video');
        try {
            v.crossOrigin = 'anonymous'; v.playsInline = true; v.preload = 'auto'; v.src = film.trailer;
            await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('cors')); });
            v.currentTime = clipStart(film.trailerStart, v.duration, len);
            await new Promise<void>(res => { v.onseeked = () => res(); });

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
            const cors = (e as Error)?.message === 'cors';
            setMsg({ tone: 'bad', text: cors
                ? "Your browser won't let me copy this trailer from storage (a permission on the video storage). Tell me and I'll fix it."
                : 'The video could not be made. Try again, or try another film.' });
        } finally {
            try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
            try { await actx?.close(); } catch { /* ignore */ }
            setBusy(false);
        }
    };

    const name = `${(film.title || 'film').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-clip.${done?.ext || 'mp4'}`;
    return (
        <Card>
            <p className="text-xs font-bold text-[#8A8A96] mb-2">SHORT VIDEO (STORY / REEL)</p>
            <p className="text-sm text-white/80 mb-3">A clip of the trailer inside the same frame, with the title{kind === 'premiere' ? ', date and price' : ''}.</p>
            <div className="flex gap-2 flex-wrap items-center mb-3">
                {LENGTHS.map(n => (
                    <button key={n} disabled={busy} onClick={() => setLen(n)} className={`rounded-full px-4 py-2 text-sm font-bold border ${len === n ? 'bg-white text-black border-white' : 'bg-[#131318] text-[#A1A1AD] border-white/[0.07]'}`}>{n} sec</button>
                ))}
                <Button variant="primary" accent="magenta" onClick={make} disabled={busy}>{busy ? `Recording… ${len}s, please wait` : '🎬 Make video'}</Button>
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
