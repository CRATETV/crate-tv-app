import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import {
    PartnerDraft, PartnerFilmDraft, PartnerBlockDraft, PartnerDayDraft, PartnerReview, PartnerPublished, PartnerPayout,
    checkDraft, emptyDraft, newDraftId, SalesSummary, PayoutBreakdown,
} from '../api/_lib/partnerRules';
import {
    callPartnerPortal, uploadPartnerFile, readVideoMinutes, money, isoToLocalInput, localInputToIso,
} from '../services/partnerApi';

// ─────────────────────────────────────────────────────────────────────────────
// FESTIVAL IN A BOX — partner portal (/partner)
//
// A partner festival's own team signs in here to upload films, build their
// screening schedule, set prices, submit the lineup to CRATE for review and
// follow ticket sales live. Nothing goes live until CRATE approves it.
// ─────────────────────────────────────────────────────────────────────────────

interface PartnerSummary {
    id: string;
    name: string;
    slug: string;
    payeeName: string;
    crateSharePct: number;
    memberEmails: string[];
    draft: PartnerDraft | null;
    review: PartnerReview;
    published: PartnerPublished | null;
    payout: PartnerPayout | null;
    cleanupDueAt?: string | null;
    cleanup?: { deletedAt: string; deletedFilmKeys: string[]; keptFilmKeys: string[] } | null;
}

type Tab = 'overview' | 'festival' | 'films' | 'schedule' | 'sales';

const navigate = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new Event('pushstate')); };

const label = 'block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5';
const input = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40';
const card = 'bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-6';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-red-600 hover:bg-red-500 text-white`;
const btnGhost = `${btn} bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200`;

const REVIEW_COPY: Record<string, { title: string; body: string; tone: string }> = {
    draft: { title: 'Not submitted yet', body: 'Build your lineup, then submit it to Crate TV for review. Nothing is public until it is approved.', tone: 'border-white/15 bg-white/[0.03]' },
    submitted: { title: 'With Crate TV for review', body: "We'll email you when it's approved or if anything needs a change. Editing now takes it back to draft.", tone: 'border-amber-500/30 bg-amber-500/10' },
    changes_requested: { title: 'Changes requested', body: 'Crate TV asked for a few changes before going live — see the note below, update your lineup, then resubmit.', tone: 'border-red-500/40 bg-red-500/10' },
    approved: { title: 'Live on Crate TV', body: 'Your festival page is live and tickets are on sale. Changes you make now stay private until you resubmit and they are approved.', tone: 'border-emerald-500/30 bg-emerald-500/10' },
};

// ─── Small pieces ────────────────────────────────────────────────────────────

const UploadField: React.FC<{
    title: string; value: string; accept: string; kind: 'poster' | 'video' | 'logo' | 'hero';
    partnerId: string; onUploaded: (url: string, file: File) => void; hint?: string;
}> = ({ title, value, accept, kind, partnerId, onUploaded, hint }) => {
    const { getUserIdToken } = useAuth();
    const [pct, setPct] = useState<number | null>(null);
    const [err, setErr] = useState('');
    const ref = useRef<HTMLInputElement>(null);
    const pick = async (file?: File) => {
        if (!file) return;
        setErr(''); setPct(0);
        try {
            const url = await uploadPartnerFile(getUserIdToken, partnerId, kind, file, setPct);
            onUploaded(url, file);
        } catch (e) {
            setErr((e as Error).message);
        } finally {
            setPct(null);
            if (ref.current) ref.current.value = '';
        }
    };
    const isImage = kind !== 'video';
    return (
        <div>
            <span className={label}>{title}</span>
            <div className="flex items-center gap-3 flex-wrap">
                {value && isImage && <img src={value} alt="" className="h-14 w-auto max-w-[120px] object-cover rounded-lg border border-white/10" />}
                {value && !isImage && <span className="text-[11px] font-bold text-emerald-400">✓ Uploaded</span>}
                <button type="button" className={btnGhost} disabled={pct !== null} onClick={() => ref.current?.click()}>
                    {pct !== null ? `Uploading ${pct}%` : value ? 'Replace' : 'Upload'}
                </button>
                <input ref={ref} type="file" accept={accept} className="hidden" onChange={e => pick(e.target.files?.[0])} />
            </div>
            {pct !== null && kind === 'video' && (
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: `${pct}%` }} /></div>
            )}
            {pct !== null && kind === 'video' && <p className="text-[11px] text-gray-500 mt-1">Keep this tab open until the upload finishes.</p>}
            {hint && !err && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
            {err && <p className="text-[11px] text-red-400 mt-1">{err}</p>}
        </div>
    );
};

const Checklist: React.FC<{ errors: string[]; warnings: string[] }> = ({ errors, warnings }) => (
    <div className="space-y-2">
        {errors.length === 0 && <p className="text-sm text-emerald-400 font-bold">✓ Ready to submit</p>}
        {errors.map((e, i) => <p key={`e${i}`} className="text-sm text-red-300">• {e}</p>)}
        {warnings.map((w, i) => <p key={`w${i}`} className="text-sm text-amber-300/80">• {w}</p>)}
    </div>
);

// ─── Festival details ───────────────────────────────────────────────────────

const FestivalTab: React.FC<{ draft: PartnerDraft; partnerId: string; onChange: (d: PartnerDraft) => void }> = ({ draft, partnerId, onChange }) => {
    const d = draft.details;
    const set = (patch: Partial<PartnerDraft['details']>) => onChange({ ...draft, details: { ...d, ...patch } });
    return (
        <div className="space-y-6">
            <div className={`${card} grid md:grid-cols-2 gap-5`}>
                <div className="md:col-span-2">
                    <label className={label}>Festival name</label>
                    <input className={input} value={d.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Philadelphia Unnamed Film Festival 2027" />
                </div>
                <div className="md:col-span-2">
                    <label className={label}>Tagline</label>
                    <input className={input} value={d.tagline} onChange={e => set({ tagline: e.target.value })} placeholder="One line that sells it" />
                </div>
                <div className="md:col-span-2">
                    <label className={label}>About the festival</label>
                    <textarea className={`${input} min-h-[120px]`} value={d.description} onChange={e => set({ description: e.target.value })} placeholder="What audiences should know — shown on your festival page." />
                </div>
                <div>
                    <label className={label}>First day</label>
                    <input type="date" className={input} value={d.startDate} onChange={e => set({ startDate: e.target.value })} />
                </div>
                <div>
                    <label className={label}>Last day</label>
                    <input type="date" className={input} value={d.endDate} onChange={e => set({ endDate: e.target.value })} />
                </div>
                <div>
                    <label className={label}>Website (optional)</label>
                    <input className={input} value={d.websiteUrl || ''} onChange={e => set({ websiteUrl: e.target.value })} placeholder="https://" />
                </div>
                <div>
                    <label className={label}>All-access festival pass price (USD)</label>
                    <input type="number" min={0} step="0.01" className={input} value={d.passPrice ?? 0} onChange={e => set({ passPrice: Number(e.target.value) })} />
                    <p className="text-[11px] text-gray-500 mt-1">0 = no pass; viewers buy blocks individually.</p>
                </div>
            </div>
            <div className={`${card} grid md:grid-cols-3 gap-5`}>
                <div>
                    <label className={label}>Brand colour</label>
                    <div className="flex items-center gap-3">
                        <input type="color" value={d.accentColor || '#e11d48'} onChange={e => set({ accentColor: e.target.value })} className="h-11 w-14 bg-transparent rounded-lg cursor-pointer" />
                        <input className={input} value={d.accentColor} onChange={e => set({ accentColor: e.target.value })} />
                    </div>
                </div>
                <UploadField title="Logo" value={d.logoUrl} accept="image/png,image/jpeg,image/webp,image/svg+xml" kind="logo" partnerId={partnerId} onUploaded={url => set({ logoUrl: url })} hint="PNG with a transparent background works best." />
                <UploadField title="Banner image" value={d.heroImageUrl} accept="image/png,image/jpeg,image/webp" kind="hero" partnerId={partnerId} onUploaded={url => set({ heroImageUrl: url })} hint="Wide image, at least 1600px across." />
            </div>
            <p className="text-[11px] text-gray-500">Times you enter are in your time zone: <strong className="text-gray-300">{d.timeZone || 'America/New_York'}</strong>.</p>
        </div>
    );
};

// ─── Films ──────────────────────────────────────────────────────────────────

const FilmEditor: React.FC<{ film: PartnerFilmDraft; partnerId: string; onChange: (f: PartnerFilmDraft) => void; onRemove: () => void; onClose: () => void }> = ({ film, partnerId, onChange, onRemove, onClose }) => {
    const set = (patch: Partial<PartnerFilmDraft>) => onChange({ ...film, ...patch });
    return (
        <div className={`${card} space-y-5 border-white/20`}>
            <div className="grid md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                    <label className={label}>Title</label>
                    <input className={input} value={film.title} onChange={e => set({ title: e.target.value })} autoFocus />
                </div>
                <div>
                    <label className={label}>Director</label>
                    <input className={input} value={film.director} onChange={e => set({ director: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={label}>Year</label><input className={input} value={film.year || ''} onChange={e => set({ year: e.target.value })} /></div>
                    <div><label className={label}>Country</label><input className={input} value={film.country || ''} onChange={e => set({ country: e.target.value })} /></div>
                </div>
                <div className="md:col-span-2">
                    <label className={label}>Synopsis</label>
                    <textarea className={`${input} min-h-[90px]`} value={film.synopsis} onChange={e => set({ synopsis: e.target.value })} />
                </div>
                <UploadField title="Film file (MP4 or MOV, under 5 GB)" value={film.videoUrl} accept="video/mp4,video/quicktime,video/x-m4v,.mov,.mp4" kind="video" partnerId={partnerId}
                    onUploaded={async (url, file) => {
                        const minutes = await readVideoMinutes(file);
                        onChange({ ...film, videoUrl: url, ...(minutes ? { durationInMinutes: minutes } : {}) });
                    }}
                    hint="H.264 MP4 at 1080p plays best for every viewer." />
                <div>
                    <label className={label}>Runtime (minutes)</label>
                    <input type="number" min={1} className={input} value={film.durationInMinutes || ''} onChange={e => set({ durationInMinutes: Number(e.target.value) })} />
                    <p className="text-[11px] text-gray-500 mt-1">Filled in automatically from the file. The watch party uses it to know when to start the next film.</p>
                </div>
                <UploadField title="Poster (portrait)" value={film.posterUrl} accept="image/png,image/jpeg,image/webp" kind="poster" partnerId={partnerId} onUploaded={url => set({ posterUrl: url })} />
                <label className="md:col-span-2 flex items-start gap-3 bg-black/30 border border-white/10 rounded-xl p-4 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={!!film.keepAfterFestival} onChange={e => set({ keepAfterFestival: e.target.checked })} />
                    <span>
                        <span className="block text-sm font-bold text-white">Keep this film on Crate TV after the festival</span>
                        <span className="block text-[12px] text-gray-400">Only tick this if the filmmaker has agreed. Unticked films (and their files) are deleted from Crate TV after the festival and rewatch week; ticked films move into the main Crate TV catalog.</span>
                    </span>
                </label>
            </div>
            <div className="flex justify-between gap-3 flex-wrap pt-2 border-t border-white/10">
                <button type="button" className={`${btn} text-red-400 hover:bg-red-500/10`} onClick={() => { if (window.confirm(`Remove "${film.title || 'this film'}" from your lineup?`)) onRemove(); }}>Remove film</button>
                <button type="button" className={btnGhost} onClick={onClose}>Done</button>
            </div>
        </div>
    );
};

const FilmsTab: React.FC<{ draft: PartnerDraft; partnerId: string; onChange: (d: PartnerDraft) => void }> = ({ draft, partnerId, onChange }) => {
    const [editing, setEditing] = useState<string | null>(null);
    const updateFilm = (f: PartnerFilmDraft) => onChange({ ...draft, films: draft.films.map(x => (x.id === f.id ? f : x)) });
    const removeFilm = (id: string) => onChange({
        ...draft,
        films: draft.films.filter(f => f.id !== id),
        days: draft.days.map(day => ({ ...day, blocks: day.blocks.map(b => ({ ...b, filmIds: b.filmIds.filter(fid => fid !== id) })) })),
    });
    const addFilm = () => {
        const f: PartnerFilmDraft = { id: newDraftId(), title: '', director: '', synopsis: '', durationInMinutes: 0, posterUrl: '', videoUrl: '' };
        onChange({ ...draft, films: [...draft.films, f] });
        setEditing(f.id);
    };
    return (
        <div className="space-y-4">
            {draft.films.length === 0 && <p className="text-gray-400 text-sm">No films yet. Add each film in your lineup — you'll arrange them into screening blocks on the Schedule tab.</p>}
            {draft.films.map(f => editing === f.id
                ? <FilmEditor key={f.id} film={f} partnerId={partnerId} onChange={updateFilm} onRemove={() => { removeFilm(f.id); setEditing(null); }} onClose={() => setEditing(null)} />
                : (
                    <button key={f.id} type="button" onClick={() => setEditing(f.id)} className={`${card} w-full flex items-center gap-4 text-left hover:border-white/25`}>
                        <div className="w-12 h-16 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">{f.posterUrl && <img src={f.posterUrl} alt="" className="w-full h-full object-cover" />}</div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-white truncate">{f.title || 'Untitled film'}</p>
                            <p className="text-xs text-gray-400 truncate">{f.director || 'Director not set'} · {f.durationInMinutes ? `${f.durationInMinutes} min` : 'runtime missing'}</p>
                        </div>
                        {f.keepAfterFestival && <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">Stays after festival</span>}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${f.videoUrl ? 'text-emerald-400' : 'text-red-400'}`}>{f.videoUrl ? 'Video ✓' : 'No video'}</span>
                    </button>
                ))}
            <button type="button" className={btnPrimary} onClick={addFilm}>+ Add film</button>
        </div>
    );
};

// ─── Schedule ───────────────────────────────────────────────────────────────

const BlockEditor: React.FC<{ block: PartnerBlockDraft; films: PartnerFilmDraft[]; onChange: (b: PartnerBlockDraft) => void; onRemove: () => void }> = ({ block, films, onChange, onRemove }) => {
    const set = (patch: Partial<PartnerBlockDraft>) => onChange({ ...block, ...patch });
    const filmById = new Map(films.map(f => [f.id, f]));
    const runtime = block.filmIds.reduce((s, id) => s + (filmById.get(id)?.durationInMinutes || 0), 0);
    const available = films.filter(f => !block.filmIds.includes(f.id));
    const move = (i: number, dir: -1 | 1) => {
        const ids = [...block.filmIds];
        const j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        set({ filmIds: ids });
    };
    return (
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
            <div className="grid md:grid-cols-[1fr_220px_120px_110px] gap-3">
                <div><label className={label}>Block title</label><input className={input} value={block.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Opening Night Shorts" /></div>
                <div><label className={label}>Starts</label><input type="datetime-local" className={input} value={isoToLocalInput(block.screeningStartTime)} onChange={e => set({ screeningStartTime: localInputToIso(e.target.value) })} /></div>
                <div><label className={label}>Price (USD)</label><input type="number" min={0} step="0.01" className={input} value={block.price < 0 ? '' : block.price} onChange={e => set({ price: e.target.value === '' ? -1 : Number(e.target.value) })} /></div>
                <div><label className={label}>Seat limit</label><input type="number" min={0} className={input} value={block.capacity || ''} placeholder="None" onChange={e => set({ capacity: e.target.value ? Number(e.target.value) : undefined })} /></div>
            </div>
            <div>
                <span className={label}>Films, in screening order {runtime > 0 && <span className="text-gray-500 normal-case tracking-normal font-bold">· about {runtime} min plus short breaks</span>}</span>
                <div className="space-y-2">
                    {block.filmIds.map((id, i) => (
                        <div key={id} className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
                            <span className="text-[10px] font-black text-gray-500 w-5">{i + 1}</span>
                            <span className="flex-1 text-sm text-white truncate">{filmById.get(id)?.title || 'Removed film'}</span>
                            <button type="button" className="text-gray-400 hover:text-white px-2" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                            <button type="button" className="text-gray-400 hover:text-white px-2" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                            <button type="button" className="text-red-400 hover:text-red-300 px-2" onClick={() => set({ filmIds: block.filmIds.filter(x => x !== id) })} aria-label="Remove">✕</button>
                        </div>
                    ))}
                    {available.length > 0 && (
                        <select className={input} value="" onChange={e => e.target.value && set({ filmIds: [...block.filmIds, e.target.value] })}>
                            <option value="">+ Add a film to this block…</option>
                            {available.map(f => <option key={f.id} value={f.id}>{f.title || 'Untitled film'}</option>)}
                        </select>
                    )}
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                    <input type="checkbox" checked={!!block.releaseAfterScreening} onChange={e => set({ releaseAfterScreening: e.target.checked })} />
                    Add these films to the main Crate TV catalog after the screening
                </label>
                <button type="button" className="text-[11px] font-black uppercase tracking-widest text-red-400 hover:text-red-300" onClick={() => { if (window.confirm('Remove this block?')) onRemove(); }}>Remove block</button>
            </div>
        </div>
    );
};

const ScheduleTab: React.FC<{ draft: PartnerDraft; onChange: (d: PartnerDraft) => void }> = ({ draft, onChange }) => {
    const setDay = (idx: number, day: PartnerDayDraft) => onChange({ ...draft, days: draft.days.map((d, i) => (i === idx ? day : d)) });
    const addDay = () => {
        const next = (draft.days.reduce((m, d) => Math.max(m, d.day), 0) || 0) + 1;
        onChange({ ...draft, days: [...draft.days, { day: next, date: '', blocks: [] }] });
    };
    const addBlock = (idx: number) => {
        const b: PartnerBlockDraft = { id: newDraftId(), title: '', filmIds: [], screeningStartTime: '', price: 10 };
        setDay(idx, { ...draft.days[idx], blocks: [...draft.days[idx].blocks, b] });
    };
    return (
        <div className="space-y-6">
            {draft.films.length === 0 && <p className="text-amber-300/80 text-sm">Add your films first (Films tab), then group them into blocks here.</p>}
            {draft.days.map((day, idx) => (
                <div key={idx} className={`${card} space-y-4`}>
                    <div className="flex items-end gap-3 flex-wrap">
                        <div className="w-24"><label className={label}>Day</label><input type="number" min={1} className={input} value={day.day} onChange={e => setDay(idx, { ...day, day: Number(e.target.value) })} /></div>
                        <div className="flex-1 min-w-[200px]"><label className={label}>Label</label><input className={input} value={day.date} placeholder="e.g. Friday, May 14" onChange={e => setDay(idx, { ...day, date: e.target.value })} /></div>
                        <button type="button" className={`${btn} text-red-400 hover:bg-red-500/10`} onClick={() => { if (window.confirm(`Remove day ${day.day} and its blocks?`)) onChange({ ...draft, days: draft.days.filter((_, i) => i !== idx) }); }}>Remove day</button>
                    </div>
                    {day.blocks.map((b, bi) => (
                        <BlockEditor key={b.id} block={b} films={draft.films}
                            onChange={nb => setDay(idx, { ...day, blocks: day.blocks.map((x, i) => (i === bi ? nb : x)) })}
                            onRemove={() => setDay(idx, { ...day, blocks: day.blocks.filter((_, i) => i !== bi) })} />
                    ))}
                    <button type="button" className={btnGhost} onClick={() => addBlock(idx)}>+ Add screening block</button>
                </div>
            ))}
            <button type="button" className={btnPrimary} onClick={addDay}>+ Add festival day</button>
            <p className="text-[11px] text-gray-500">Each block becomes a live watch party at its start time: films play back to back for everyone, with short breaks in between. Ticket holders can rewatch for 7 days afterwards.</p>
        </div>
    );
};

// ─── Sales ──────────────────────────────────────────────────────────────────

const SalesTab: React.FC<{ partner: PartnerSummary }> = ({ partner }) => {
    const { getUserIdToken } = useAuth();
    const [data, setData] = useState<{ sales: SalesSummary; payout: PayoutBreakdown; payoutStatus: PartnerPayout | null; generatedAt: string } | null>(null);
    const [err, setErr] = useState('');
    const load = useCallback(async () => {
        try { setData(await callPartnerPortal(getUserIdToken, 'sales', { partnerId: partner.id })); setErr(''); }
        catch (e) { setErr((e as Error).message); }
    }, [getUserIdToken, partner.id]);
    useEffect(() => {
        load();
        const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 60_000);
        return () => clearInterval(t);
    }, [load]);
    if (err) return <p className="text-red-400 text-sm">{err}</p>;
    if (!data) return <p className="text-gray-400 text-sm">Loading sales…</p>;
    const { sales, payout, payoutStatus } = data;
    const lines = [...sales.blocks, sales.pass, sales.rentals].filter(l => l.orders > 0 || sales.blocks.includes(l));
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    ['Orders', String(sales.totals.orders)],
                    ['Ticket sales', money(sales.totals.gross)],
                    [`Crate TV (${payout.crateSharePct}%)`, money(payout.crateAmount)],
                    ['Your share', money(payout.partnerAmount)],
                ].map(([k, v]) => (
                    <div key={k} className={card}><p className={label}>{k}</p><p className="text-2xl font-black text-white">{v}</p></div>
                ))}
            </div>
            <div className={card}>
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-500"><th className="pb-3">Item</th><th className="pb-3 text-right">Orders</th><th className="pb-3 text-right">Sales</th></tr></thead>
                    <tbody>
                        {lines.map(l => (
                            <tr key={l.id} className="border-t border-white/5"><td className="py-2.5 text-white">{l.label}</td><td className="py-2.5 text-right text-gray-300">{l.orders}</td><td className="py-2.5 text-right text-white font-bold">{money(l.gross)}</td></tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-[11px] text-gray-500 mt-4">
                    {sales.totals.free > 0 && `${sales.totals.free} free/complimentary ticket(s) included in orders. `}
                    Updated {new Date(data.generatedAt).toLocaleTimeString()} · refreshes every minute. Buyer contact details stay private with Crate TV.
                </p>
            </div>
            <div className={card}>
                <p className={label}>Payout</p>
                <div className="text-sm text-gray-300 space-y-1">
                    <p>Ticket sales {money(payout.gross)}{payout.deductions > 0 && <> − deductions {money(payout.deductions)}{payoutStatus?.deductionsNote ? ` (${payoutStatus.deductionsNote})` : ''}</>} = <strong className="text-white">{money(payout.net)}</strong></p>
                    <p>Crate TV share {payout.crateSharePct}%: {money(payout.crateAmount)} · <strong className="text-white">Paid to {partner.payeeName}: {money(payout.partnerAmount)}</strong></p>
                    {payoutStatus?.paidAt
                        ? <p className="text-emerald-400 font-bold">Paid {money(payoutStatus.paidAmount)} on {new Date(payoutStatus.paidAt).toLocaleDateString()}{payoutStatus.paidNote ? ` — ${payoutStatus.paidNote}` : ''}</p>
                        : <p className="text-gray-500">Final payout is sent after the festival and rewatch week close.</p>}
                </div>
            </div>
        </div>
    );
};

// ─── Page ───────────────────────────────────────────────────────────────────

const PartnerPortalPage: React.FC = () => {
    const { user, getUserIdToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [partners, setPartners] = useState<PartnerSummary[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [draft, setDraft] = useState<PartnerDraft | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<Tab>('overview');

    const partner = partners.find(p => p.id === activeId) || null;
    const check = useMemo(() => checkDraft(draft), [draft]);

    const load = useCallback(async (selectId?: string) => {
        setLoading(true);
        try {
            const res = await callPartnerPortal<{ partners: PartnerSummary[] }>(getUserIdToken, 'me');
            setPartners(res.partners);
            const pick = res.partners.find(p => p.id === selectId) || res.partners[0] || null;
            setActiveId(pick?.id || null);
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const d = pick?.draft || (pick ? emptyDraft(pick.name) : null);
            setDraft(d ? { ...d, details: { ...d.details, timeZone: d.details.timeZone || tz } } : null);
            setDirty(false);
            setError('');
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [getUserIdToken]);

    // Accept an invitation link (/partner?invite=…), then load.
    useEffect(() => {
        if (!user) return;
        const params = new URLSearchParams(window.location.search);
        const token = params.get('invite');
        (async () => {
            if (token) {
                try {
                    const res = await callPartnerPortal<{ partnerId: string; name: string }>(getUserIdToken, 'acceptInvite', { token });
                    setNotice(`Welcome to the ${res.name} team.`);
                    window.history.replaceState({}, '', '/partner');
                    await load(res.partnerId);
                    return;
                } catch (e) {
                    setError((e as Error).message);
                    window.history.replaceState({}, '', '/partner');
                }
            }
            await load();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid]);

    // Warn before leaving with unsaved changes.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    const change = (d: PartnerDraft) => { setDraft(d); setDirty(true); setNotice(''); };

    const save = async (): Promise<boolean> => {
        if (!partner || !draft) return false;
        setSaving(true); setError('');
        try {
            const res = await callPartnerPortal<{ draft: PartnerDraft; review: PartnerReview }>(getUserIdToken, 'saveDraft', { partnerId: partner.id, draft });
            setDraft(res.draft);
            setPartners(ps => ps.map(p => (p.id === partner.id ? { ...p, draft: res.draft, review: res.review } : p)));
            setDirty(false);
            setNotice('Saved.');
            return true;
        } catch (e) {
            setError((e as Error).message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const submit = async () => {
        if (!partner) return;
        if (dirty && !(await save())) return;
        if (!window.confirm('Submit this lineup to Crate TV for review?')) return;
        setSaving(true); setError('');
        try {
            const res = await callPartnerPortal<{ review: PartnerReview }>(getUserIdToken, 'submit', { partnerId: partner.id });
            setPartners(ps => ps.map(p => (p.id === partner.id ? { ...p, review: res.review } : p)));
            setNotice("Submitted — we'll email you once it's reviewed.");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (!user) return null; // route redirects to login

    const tabs: [Tab, string][] = [['overview', 'Overview'], ['festival', 'Festival & branding'], ['films', `Films (${draft?.films.length || 0})`], ['schedule', 'Schedule'], ['sales', 'Sales']];
    const reviewState = partner?.review?.state || 'draft';
    const copy = REVIEW_COPY[reviewState] || REVIEW_COPY.draft;

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="max-w-5xl mx-auto px-4 pt-28 pb-32">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-2">Festival portal</p>
                {loading && <p className="text-gray-400">Loading…</p>}
                {!loading && !partner && (
                    <div className={card}>
                        <h1 className="text-2xl font-black mb-2">No festival linked to this account</h1>
                        <p className="text-gray-400 text-sm">Open the invitation link Crate TV emailed you while signed in as <strong className="text-gray-200">{user.email}</strong>. If you signed up with a different email, sign in with that one instead.</p>
                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                    </div>
                )}
                {!loading && partner && draft && (
                    <>
                        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight">{draft.details.title || partner.name}</h1>
                                {partners.length > 1 && (
                                    <select className="mt-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm" value={partner.id} onChange={e => load(e.target.value)}>
                                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {partner.published && <button type="button" className={btnGhost} onClick={() => navigate(`/festivals/${partner.slug}`)}>View public page</button>}
                                <button type="button" className={btnGhost} disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
                                <button type="button" className={btnPrimary} disabled={saving || check.errors.length > 0 || (reviewState === 'submitted' && !dirty)} onClick={submit}>Submit for review</button>
                            </div>
                        </div>
                        {(notice || error) && <p className={`text-sm mb-4 ${error ? 'text-red-400' : 'text-emerald-400'}`}>{error || notice}</p>}
                        <nav className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
                            {tabs.map(([id, name]) => (
                                <button key={id} type="button" onClick={() => setTab(id)}
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${tab === id ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                    {name}
                                </button>
                            ))}
                        </nav>

                        {tab === 'overview' && (
                            <div className="space-y-5">
                                <div className={`rounded-2xl border p-5 ${copy.tone}`}>
                                    <p className="font-black text-lg">{copy.title}</p>
                                    <p className="text-sm text-gray-300 mt-1">{copy.body}</p>
                                    {partner.review?.note && <p className="text-sm mt-3 bg-black/30 rounded-xl p-3 text-white whitespace-pre-wrap">{partner.review.note}</p>}
                                </div>
                                <div className={card}>
                                    <p className={label}>Before you submit</p>
                                    <Checklist errors={check.errors} warnings={check.warnings} />
                                </div>
                                <div className={card}>
                                    <p className={label}>After the festival</p>
                                    {partner.cleanup?.deletedAt
                                        ? <p className="text-sm text-gray-300">Festival films were removed from Crate TV on {new Date(partner.cleanup.deletedAt).toLocaleDateString()}. {partner.cleanup.keptFilmKeys.length} film{partner.cleanup.keptFilmKeys.length === 1 ? '' : 's'} stayed on Crate TV with your permission.</p>
                                        : <p className="text-sm text-gray-300">
                                            Films are deleted from Crate TV {partner.cleanupDueAt ? <>on <strong className="text-white">{new Date(partner.cleanupDueAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></> : 'one week after the rewatch week ends'}, unless you tick <em>Keep this film on Crate TV after the festival</em> on the Films tab ({draft.films.filter(f => f.keepAfterFestival).length} of {draft.films.length} kept). Kept films stay in the Crate TV catalog.
                                          </p>}
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className={card}>
                                        <p className={label}>Your agreement</p>
                                        <p className="text-sm text-gray-300">Crate TV keeps <strong className="text-white">{partner.crateSharePct}%</strong> of net ticket sales; the rest is paid to <strong className="text-white">{partner.payeeName}</strong> after the festival.</p>
                                    </div>
                                    <div className={card}>
                                        <p className={label}>Your team</p>
                                        <p className="text-sm text-gray-300">{partner.memberEmails.join(', ') || '—'}</p>
                                        <p className="text-[11px] text-gray-500 mt-2">To add a teammate, ask Crate TV to send them an invitation.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {tab === 'festival' && <FestivalTab draft={draft} partnerId={partner.id} onChange={change} />}
                        {tab === 'films' && <FilmsTab draft={draft} partnerId={partner.id} onChange={change} />}
                        {tab === 'schedule' && <ScheduleTab draft={draft} onChange={change} />}
                        {tab === 'sales' && <SalesTab partner={partner} />}

                        {dirty && (
                            <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:left-auto z-50 bg-[#111] border border-white/15 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
                                <span className="text-sm text-gray-300">Unsaved changes</span>
                                <button type="button" className={btnPrimary} disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default PartnerPortalPage;
