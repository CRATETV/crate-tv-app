import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Movie } from '../../types';
import { Button, Card, EmptyState, Notice, PageHeader, copyText, inputClass } from './ui';
import { instagramCaption, shareLink, trimSynopsis, wrapLines } from '../../api/_lib/shareCopy';

// "Share a film": pick a film, get a ready-to-post Instagram graphic (post or story size) with the
// poster, title and synopsis, plus a caption with a tagged link. Drawn in the browser — nothing is stored.
type Format = 'post' | 'story';
const SIZES: Record<Format, { w: number; h: number; label: string }> = {
    post: { w: 1080, h: 1350, label: 'Post (4:5)' },
    story: { w: 1080, h: 1920, label: 'Story / Reel (9:16)' },
};
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const loadPoster = (url: string) => new Promise<HTMLImageElement | null>(resolve => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/api/proxy-image?url=${encodeURIComponent(url)}&w=1000`;
});

const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
};

function sparkle(c: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) {
    c.save(); c.globalAlpha = alpha; c.fillStyle = '#fff'; c.translate(x, y); c.beginPath();
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.12, r * 0.12, 0, r); c.quadraticCurveTo(-r * 0.12, r * 0.12, 0, 0); }
    c.fill(); c.restore();
}

export function drawShareGraphic(canvas: HTMLCanvasElement, film: Movie, poster: HTMLImageElement | null, format: Format) {
    const { w, h } = SIZES[format];
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d'); if (!c) return;
    // Background: deep ink with coral / magenta / violet glows.
    c.fillStyle = '#0B0B0D'; c.fillRect(0, 0, w, h);
    const glow = (x: number, y: number, r: number, col: string) => {
        const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(11,11,13,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
    };
    glow(w * 0.15, h * 0.12, w * 0.9, 'rgba(255,59,92,0.55)');
    glow(w * 0.95, h * 0.45, w * 0.9, 'rgba(123,77,255,0.5)');
    glow(w * 0.2, h * 0.95, w * 0.9, 'rgba(255,154,60,0.4)');
    // Sparkles (fixed pattern so the picture is the same every time).
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) sparkle(c, rnd() * w, rnd() * h, 14 + rnd() * 34, 0.25 + rnd() * 0.6);

    // Poster card, tilted a little.
    const pw = format === 'story' ? 640 : 360, ph = Math.round(pw * 1.5);
    const px = (w - pw) / 2, py = format === 'story' ? 190 : 80;
    c.save(); c.translate(w / 2, py + ph / 2); c.rotate(-0.035); c.translate(-w / 2, -(py + ph / 2));
    c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    roundRect(c, px, py, pw, ph, 28); c.fillStyle = '#1b1b22'; c.fill(); c.shadowColor = 'transparent';
    c.save(); roundRect(c, px, py, pw, ph, 28); c.clip();
    if (poster) {
        const s = Math.max(pw / poster.width, ph / poster.height);
        c.drawImage(poster, px + (pw - poster.width * s) / 2, py + (ph - poster.height * s) / 2, poster.width * s, poster.height * s);
    }
    c.restore();
    roundRect(c, px, py, pw, ph, 28); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,0.85)'; c.stroke();
    c.restore();

    // Badge.
    const badge = 'NOW STREAMING FREE';
    c.font = `800 30px ${FONT}`;
    const bw = c.measureText(badge).width + 56, bx = (w - bw) / 2, by = py + ph + 48;
    roundRect(c, bx, by, bw, 62, 31); c.fillStyle = '#FF3B5C'; c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(badge, w / 2, by + 33);

    // Title, director, synopsis.
    let y = by + 62 + 40;
    c.fillStyle = '#fff'; c.textBaseline = 'top';
    const titleSize = format === 'story' ? 84 : 72;
    c.font = `900 ${titleSize}px ${FONT}`;
    const tl = wrapLines((film.title || '').toUpperCase(), w - 160, s => c.measureText(s).width, 2);
    tl.forEach(l => { c.fillText(l, w / 2, y); y += titleSize * 1.05; });
    y += 10;
    if (film.director) { c.font = `600 34px ${FONT}`; c.fillStyle = '#FFC53D'; c.fillText(`Directed by ${film.director}`, w / 2, y); y += 56; }
    c.font = `400 34px ${FONT}`; c.fillStyle = 'rgba(255,255,255,0.88)';
    const room = Math.max(2, Math.floor((h - 150 - y) / 46));
    wrapLines(trimSynopsis(film.synopsis || '', 260), w - 200, s => c.measureText(s).width, Math.min(room, format === 'story' ? 7 : 3))
        .forEach(l => { c.fillText(l, w / 2, y); y += 46; });

    // Footer.
    c.font = `900 40px ${FONT}`; c.fillStyle = '#fff'; c.textBaseline = 'alphabetic';
    c.fillText('CRATE TV', w / 2, h - 72);
    c.font = `500 26px ${FONT}`; c.fillStyle = 'rgba(255,255,255,0.7)';
    c.fillText('Link in bio · cratetv.net', w / 2, h - 32);
}

const ShareFilmTab: React.FC<{ movies: Record<string, Movie> }> = ({ movies }) => {
    const films = useMemo(() => (Object.values(movies) as Movie[]).filter(m => m && m.key && m.title).sort((a, b) => a.title.localeCompare(b.title)), [movies]);
    const [q, setQ] = useState('');
    const [key, setKey] = useState('');
    const [format, setFormat] = useState<Format>('post');
    const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const film = films.find(f => f.key === key) || null;
    const shown = films.filter(f => f.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40);
    const link = film ? shareLink(window.location.origin, film.key) : '';
    const caption = film ? instagramCaption(film, link) : '';

    useEffect(() => {
        if (!film) return;
        let cancelled = false;
        loadPoster(film.poster).then(img => { if (!cancelled && canvasRef.current) drawShareGraphic(canvasRef.current, film, img, format); });
        return () => { cancelled = true; };
    }, [film, format]);

    const blobOf = () => new Promise<Blob | null>(res => canvasRef.current ? canvasRef.current.toBlob(b => res(b), 'image/png') : res(null));
    const fileName = () => `${(film?.title || 'film').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${format}.png`;
    const download = async () => {
        const b = await blobOf(); if (!b) return setNote({ tone: 'error', text: 'Could not make the picture. Try another film.' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fileName(); a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        setNote({ tone: 'success', text: 'Saved. Now post it and paste the caption.' });
    };
    const share = async () => {
        const b = await blobOf(); if (!b) return;
        const file = new File([b], fileName(), { type: 'image/png' });
        try {
            if ((navigator as any).canShare?.({ files: [file] })) await (navigator as any).share({ files: [file], text: caption });
            else await download();
        } catch { /* closed the share sheet */ }
    };
    const copyCaption = async () => { await copyText(caption); setNote({ tone: 'success', text: 'Caption copied.' }); };

    return (
        <div className="space-y-6">
            <PageHeader title="Share a film" subtitle="Pick a film, get a ready-to-post Instagram picture and caption." accent="magenta" />
            {note && <Notice tone={note.tone}>{note.text}</Notice>}
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <Card>
                    <input className={inputClass} placeholder="Search films…" value={q} onChange={e => setQ(e.target.value)} />
                    <div className="mt-3 max-h-[420px] overflow-y-auto space-y-1">
                        {shown.length === 0 && <p className="text-sm text-[#8A8A96] p-2">No films match.</p>}
                        {shown.map(f => (
                            <button key={f.key} onClick={() => { setKey(f.key); setNote(null); }}
                                className={`w-full text-left rounded-xl px-3 py-2 text-sm font-semibold ${f.key === key ? 'bg-white text-black' : 'text-white/90 hover:bg-white/[0.06]'}`}>{f.title}</button>
                        ))}
                    </div>
                </Card>
                {!film ? <EmptyState icon="📸" title="Choose a film" text="Its poster, title and synopsis turn into a shareable picture." /> : (
                    <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_1fr] items-start">
                        <canvas ref={canvasRef} className="w-full rounded-2xl border border-white/10" style={{ aspectRatio: `${SIZES[format].w} / ${SIZES[format].h}` }} />
                        <div className="space-y-4 min-w-0">
                            <div className="flex gap-2 flex-wrap">
                                {(Object.keys(SIZES) as Format[]).map(f => (
                                    <button key={f} onClick={() => setFormat(f)} className={`rounded-full px-4 py-2 text-sm font-bold border ${format === f ? 'bg-white text-black border-white' : 'bg-[#131318] text-[#A1A1AD] border-white/[0.07]'}`}>{SIZES[f].label}</button>
                                ))}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Button variant="primary" accent="magenta" onClick={download}>⬇ Download picture</Button>
                                <Button onClick={share}>📲 Share from phone</Button>
                            </div>
                            <Card>
                                <p className="text-xs font-bold text-[#8A8A96] mb-2">CAPTION</p>
                                <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans">{caption}</pre>
                                <div className="mt-3"><Button size="sm" onClick={copyCaption}>Copy caption</Button></div>
                            </Card>
                            <p className="text-xs text-[#8A8A96] break-all">Link used: {link}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ShareFilmTab;
