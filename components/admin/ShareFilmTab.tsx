import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Movie } from '../../types';
import { Button, Card, EmptyState, Notice, PageHeader, copyText, inputClass } from './ui';
import { ShareKind, detectKind, instagramCaption, shareLink, shareWording, trimSynopsis, wrapLines } from '../../api/_lib/shareCopy';

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

const SERIF = 'Georgia, "Times New Roman", serif';
const GOLD = '#C9A45C';

/** Letter-spaced text (canvas letterSpacing is not in every browser, so space it by hand). */
function spaced(c: CanvasRenderingContext2D, text: string, cx: number, y: number, gap: number) {
    const chars = [...text];
    const widths = chars.map(ch => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let x = cx - total / 2; const prev = c.textAlign; c.textAlign = 'left';
    chars.forEach((ch, i) => { c.fillText(ch, x, y); x += widths[i] + gap; });
    c.textAlign = prev;
}

export function drawShareGraphic(canvas: HTMLCanvasElement, film: Movie, poster: HTMLImageElement | null, format: Format, kind: ShareKind) {
    const { w, h } = SIZES[format];
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d'); if (!c) return;
    const wording = shareWording(film, kind);
    // Matte black with one soft warm light behind the poster and a gold hairline frame.
    c.fillStyle = '#0A0A0C'; c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.95);
    g.addColorStop(0, 'rgba(201,164,92,0.20)'); g.addColorStop(1, 'rgba(10,10,12,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(201,164,92,0.55)'; c.lineWidth = 2; c.strokeRect(36, 36, w - 72, h - 72);

    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    // Top label.
    c.fillStyle = GOLD; c.font = `700 28px ${FONT}`;
    spaced(c, wording.badge, w / 2, format === 'story' ? 150 : 108, 9);

    // Poster, straight, with a soft shadow.
    const pw = format === 'story' ? 600 : 340, ph = Math.round(pw * 1.5);
    const px = (w - pw) / 2, py = format === 'story' ? 200 : 135;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 50; c.shadowOffsetY = 20;
    c.fillStyle = '#17171c'; c.fillRect(px, py, pw, ph); c.restore();
    if (poster) {
        c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip();
        const sc = Math.max(pw / poster.width, ph / poster.height);
        c.drawImage(poster, px + (pw - poster.width * sc) / 2, py + (ph - poster.height * sc) / 2, poster.width * sc, poster.height * sc);
        c.restore();
    }
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.strokeRect(px, py, pw, ph);

    // Title (serif), director, gold rule.
    let y = py + ph + (format === 'story' ? 110 : 80);
    c.fillStyle = '#fff'; c.font = `700 ${format === 'story' ? 76 : 64}px ${SERIF}`;
    const size = format === 'story' ? 76 : 64;
    const tl = wrapLines(film.title || '', w - 200, t => c.measureText(t).width, 2);
    tl.forEach(l => { c.fillText(l, w / 2, y); y += size * 1.08; });
    y += 4;
    if (film.director) { c.fillStyle = 'rgba(255,255,255,0.72)'; c.font = `500 28px ${FONT}`; spaced(c, `DIRECTED BY ${film.director.toUpperCase()}`, w / 2, y, 3); y += 34; }
    if (wording.when) { y += 14; c.fillStyle = GOLD; c.font = `700 36px ${FONT}`; c.fillText(wording.when, w / 2, y); y += 40; }
    if (wording.price) { c.fillStyle = 'rgba(255,255,255,0.8)'; c.font = `500 28px ${FONT}`; c.fillText(wording.price, w / 2, y); y += 30; }
    y += 18; c.fillStyle = GOLD; c.fillRect(w / 2 - 40, y, 80, 2); y += 46;

    // Synopsis: as many lines as fit above the footer.
    c.fillStyle = 'rgba(255,255,255,0.84)'; c.font = `400 31px ${SERIF}`;
    const room = Math.floor((h - 190 - y) / 44);
    if (room >= 2) wrapLines(trimSynopsis(film.synopsis || '', 230), w - 220, t => c.measureText(t).width, Math.min(room, format === 'story' ? 6 : 3))
        .forEach(l => { c.fillText(l, w / 2, y); y += 44; });

    // Footer: wordmark and where to watch.
    c.fillStyle = '#fff'; c.font = `800 34px ${FONT}`; spaced(c, 'CRATE TV', w / 2, h - 118, 10);
    c.fillStyle = GOLD; c.font = `600 24px ${FONT}`; c.fillText(wording.cta, w / 2, h - 84);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.font = `500 22px ${FONT}`; c.fillText('cratetv.net · link in bio', w / 2, h - 52);
}

const ShareFilmTab: React.FC<{ movies: Record<string, Movie> }> = ({ movies }) => {
    const films = useMemo(() => (Object.values(movies) as Movie[]).filter(m => m && m.key && m.title).sort((a, b) => a.title.localeCompare(b.title)), [movies]);
    const [q, setQ] = useState('');
    const [key, setKey] = useState('');
    const [format, setFormat] = useState<Format>('post');
    const [kindPick, setKindPick] = useState<ShareKind | 'auto'>('auto');
    const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const film = films.find(f => f.key === key) || null;
    const shown = films.filter(f => f.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 40);
    const kind: ShareKind = film ? (kindPick === 'auto' ? detectKind(film) : kindPick) : 'streaming';
    const link = film ? shareLink(window.location.origin, film.key) : '';
    const caption = film ? instagramCaption(film, link, kind) : '';

    useEffect(() => {
        if (!film) return;
        let cancelled = false;
        loadPoster(film.poster).then(img => { if (!cancelled && canvasRef.current) drawShareGraphic(canvasRef.current, film, img, format, kind); });
        return () => { cancelled = true; };
    }, [film, format, kind]);

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
                            <div className="flex gap-2 flex-wrap items-center">
                                {([['auto', 'Auto'], ['premiere', 'Premiere'], ['streaming', 'Now streaming']] as const).map(([k, label]) => (
                                    <button key={k} onClick={() => setKindPick(k)} className={`rounded-full px-4 py-2 text-sm font-bold border ${kindPick === k ? 'bg-white text-black border-white' : 'bg-[#131318] text-[#A1A1AD] border-white/[0.07]'}`}>{label}</button>
                                ))}
                                <span className="text-xs text-[#8A8A96]">Showing: {kind === 'premiere' ? 'Premiere' : 'Now streaming'}</span>
                            </div>
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
