// Admin → Promo pages. Make a cinematic promo site for a film, edit every word
// and picture, change the look, preview, publish, and see votes and sign-ups.
// The look (template) lives in components/promo/*; each page here is just data.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    PromoPage, PromoSide, PromoMedia, PROMO_FONTS, PROMO_LOOK_PRESETS, PromoFont, promoSlugify, slugProblem, theChampExample,
} from '../../api/_lib/promoRules';
import FightNightTemplate from '../promo/FightNightTemplate';
import PromoPartnersView from '../promo/PromoPartnersView';
import { PageHeader, Card, Button, Field, inputClass, EmptyState, Modal, Notice, Pill, Disclosure, StatTile, adminPost, copyText, shortDate } from './ui';

type Summary = { slug: string; title: string; published: boolean; updatedAt?: string; votesA: number; votesB: number; signups: number };
type Entry = { email: string; side: 'a' | 'b' | null; createdAt?: string };

const API = '/api/promo-pages';
const pageUrl = (slug: string) => `https://cratetv.net/p/${slug}`;
const subUrl = (slug: string) => `https://${slug}.cratetv.net`;

// ── Small building blocks ───────────────────────────────────────────────────
const Text: React.FC<{ label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; long?: boolean }> = ({ label, value, onChange, hint, placeholder, long }) => (
    <Field label={label} hint={hint}>
        {long
            ? <textarea className={`${inputClass} min-h-[90px]`} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
            : <input className={inputClass} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />}
    </Field>
);

const Toggle: React.FC<{ label: string; on: boolean; onChange: (v: boolean) => void; hint?: string }> = ({ label, on, onChange, hint }) => (
    <button type="button" onClick={() => onChange(!on)} className="flex items-center justify-between gap-4 w-full text-left rounded-xl bg-[#0B0B0D] border border-white/10 px-3.5 py-2.5">
        <span><span className="text-sm text-white font-semibold">{label}</span>{hint && <span className="block text-xs text-[#8A8A96]">{hint}</span>}</span>
        <span className={`w-10 h-6 rounded-full relative transition-colors ${on ? 'bg-[#1FCB7A]' : 'bg-white/15'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-5' : 'left-1'}`} />
        </span>
    </button>
);

async function uploadFile(slug: string, file: File): Promise<string> {
    const { signedUrl, publicUrl } = await adminPost<{ signedUrl: string; publicUrl: string }>(API, { action: 'upload', slug, fileName: file.name, fileType: file.type, fileSize: file.size });
    const r = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!r.ok) throw new Error(`Upload failed (${r.status}).`);
    return publicUrl;
}

/** Pick a file → it uploads → you get the link. Also lets you paste a link. */
const Upload: React.FC<{ slug: string; label: string; value: string; onChange: (url: string, file?: File) => void; accept?: string; round?: boolean }> = ({ slug, label, value, onChange, accept = 'image/*', round }) => {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const ref = useRef<HTMLInputElement>(null);
    const isVid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value);
    return (
        <Field label={label}>
            <div className="flex items-center gap-3">
                <div className={`w-16 h-16 shrink-0 ${round ? 'rounded-full' : 'rounded-xl'} bg-[#0B0B0D] border border-white/10 overflow-hidden grid place-items-center text-[10px] text-[#5A5A66]`}>
                    {value ? (isVid ? <video src={value} muted className="w-full h-full object-cover" /> : <img src={value} alt="" className="w-full h-full object-cover" />) : 'none'}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex gap-2">
                        <Button type="button" size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}</Button>
                        {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Button>}
                    </div>
                    <input className={`${inputClass} !py-1.5 text-xs`} value={value} placeholder="…or paste a link (https://)" onChange={e => onChange(e.target.value)} />
                    {err && <p className="text-xs text-[#FF6B85]">{err}</p>}
                </div>
                <input ref={ref} type="file" accept={accept} className="hidden" onChange={async e => {
                    const f = e.target.files?.[0]; e.target.value = '';
                    if (!f) return;
                    setBusy(true); setErr('');
                    try { onChange(await uploadFile(slug, f), f); } catch (x: any) { setErr(x?.message || 'Upload failed.'); } finally { setBusy(false); }
                }} />
            </div>
        </Field>
    );
};

/** A list you can add to, reorder and remove from. */
function ListEditor<T>({ items, onChange, blank, addLabel, render, max = 40 }: {
    items: T[]; onChange: (v: T[]) => void; blank: () => T; addLabel: string; max?: number;
    render: (item: T, set: (v: T) => void, i: number) => React.ReactNode;
}) {
    const move = (i: number, d: number) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
    return (
        <div className="space-y-3">
            {items.map((it, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex justify-end gap-1 mb-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</Button>
                    </div>
                    {render(it, v => onChange(items.map((x, j) => (j === i ? v : x))), i)}
                </div>
            ))}
            {items.length < max && <Button type="button" size="sm" onClick={() => onChange([...items, blank()])}>+ {addLabel}</Button>}
        </div>
    );
}

const POSITIONS: { label: string; pos: string }[] = [
    { label: 'Top', pos: '50% 20%' }, { label: 'Upper', pos: '50% 35%' }, { label: 'Middle', pos: '50% 50%' }, { label: 'Lower', pos: '50% 70%' },
];

const toLocalInput = (iso: string) => {
    const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
    const d = new Date(t); const off = d.getTimezoneOffset();
    return new Date(t - off * 60000).toISOString().slice(0, 16);
};

// ── Editor ──────────────────────────────────────────────────────────────────
const SideEditor: React.FC<{ slug: string; label: string; side: PromoSide; onChange: (s: PromoSide) => void }> = ({ slug, label, side, onChange }) => {
    const set = (p: Partial<PromoSide>) => onChange({ ...side, ...p });
    return (
        <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
                <Text label="Big name" value={side.first} onChange={v => set({ first: v })} placeholder="Ace" />
                <Text label="Second line" value={side.last} onChange={v => set({ last: v })} placeholder="Broadus" />
                <Text label="Nickname" value={side.nickname} onChange={v => set({ nickname: v })} placeholder="optional" />
                <Text label={`Corner label`} value={side.corner} onChange={v => set({ corner: v })} placeholder={label} />
            </div>
            <Upload slug={slug} label="Photo (tall, waist up, dark background looks best)" value={side.photo} onChange={v => set({ photo: v })} />
            <Field label="Tale of the tape" hint="Rows with an empty value are hidden on the page.">
                <div className="space-y-2">
                    {side.tape.map((row, i) => (
                        <div key={i} className="flex gap-2">
                            <input className={inputClass} value={row[0]} placeholder="Record" onChange={e => set({ tape: side.tape.map((r, j) => j === i ? [e.target.value, r[1]] : r) })} />
                            <input className={inputClass} value={row[1]} placeholder="24-1" onChange={e => set({ tape: side.tape.map((r, j) => j === i ? [r[0], e.target.value] : r) })} />
                            <Button type="button" size="sm" variant="ghost" onClick={() => set({ tape: side.tape.filter((_, j) => j !== i) })} aria-label="Remove row">✕</Button>
                        </div>
                    ))}
                    {side.tape.length < 12 && <Button type="button" size="sm" onClick={() => set({ tape: [...side.tape, ['', '']] })}>+ Add row</Button>}
                </div>
            </Field>
        </div>
    );
};

const PromoEditor: React.FC<{ initial: PromoPage; onBack: () => void; onChanged: () => void }> = ({ initial, onBack, onChanged }) => {
    const [page, setPage] = useState<PromoPage>(initial);
    const [saved, setSaved] = useState<string>(JSON.stringify(initial));
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [preview, setPreview] = useState<null | 'site' | 'reveal' | 'partners'>(null);
    const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [entries, setEntries] = useState<{ entries: Entry[]; counts: { votesA: number; votesB: number; signups: number } } | null>(null);
    const dirty = JSON.stringify(page) !== saved;
    const slug = page.slug;

    const up = <K extends keyof PromoPage>(k: K, v: Partial<PromoPage[K]>) =>
        setPage(p => ({ ...p, [k]: Array.isArray(v) ? v : { ...(p[k] as object), ...(v as object) } }));

    useEffect(() => {
        const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const save = async () => {
        setBusy(true); setMsg(null);
        try {
            const r = await adminPost<{ page: PromoPage }>(API, { action: 'save', slug, page });
            setPage(r.page); setSaved(JSON.stringify(r.page)); setMsg({ tone: 'success', text: 'Saved.' }); onChanged();
        } catch (e: any) { setMsg({ tone: 'error', text: e?.message || 'Could not save.' }); }
        finally { setBusy(false); }
    };
    const publish = async (published: boolean) => {
        if (published && dirty) await save();
        setBusy(true); setMsg(null);
        try {
            await adminPost(API, { action: 'publish', slug, published });
            setPage(p => ({ ...p, published })); setSaved(s => { const o = JSON.parse(s); o.published = published; return JSON.stringify(o); });
            setMsg({ tone: 'success', text: published ? 'Live! The page is public now.' : 'Taken down. Only you can see it here.' }); onChanged();
        } catch (e: any) { setMsg({ tone: 'error', text: e?.message || 'Could not change that.' }); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        setBusy(true);
        try { await adminPost(API, { action: 'delete', slug, confirm: deleteText.trim() }); onChanged(); onBack(); }
        catch (e: any) { setMsg({ tone: 'error', text: e?.message || 'Could not delete.' }); setConfirmDelete(false); }
        finally { setBusy(false); }
    };
    const loadEntries = async () => {
        try { setEntries(await adminPost(API, { action: 'entries', slug })); } catch (e: any) { setMsg({ tone: 'error', text: e?.message || 'Could not load votes.' }); }
    };
    const downloadCsv = () => {
        if (!entries) return;
        const rows = [['email', 'side', 'signed up'], ...entries.entries.map(e => [e.email, e.side === 'a' ? page.sideA.first : e.side === 'b' ? page.sideB.first : '', e.createdAt || ''])];
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `${slug}-signups.csv`; a.click();
    };

    const previewPage = useMemo(() => preview === 'reveal' ? { ...page, countdown: { ...page.countdown, forceReveal: true } } : page, [page, preview]);
    const media = page.hero.media;

    return (
        <div>
            <PageHeader
                title={page.title || 'Untitled'}
                subtitle={page.published ? `Live at ${pageUrl(slug)}` : 'Draft — only people in this dashboard can see it.'}
                accent="orange"
                actions={<>
                    <Button onClick={onBack} variant="ghost">← All pages</Button>
                    <Button onClick={() => setPreview('site')}>👁 Preview</Button>
                    <Button onClick={save} disabled={busy || !dirty} variant="primary" accent="orange">{dirty ? 'Save changes' : 'Saved'}</Button>
                    {page.published
                        ? <Button onClick={() => publish(false)} disabled={busy} variant="danger">Take down</Button>
                        : <Button onClick={() => publish(true)} disabled={busy} variant="primary" accent="green">Publish</Button>}
                </>}
            />
            {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
            {dirty && <div className="mb-4"><Notice tone="warn">You have changes that aren't saved yet.</Notice></div>}

            <div className="space-y-3">
                <Disclosure id={`promo-${slug}-basics`} title="The basics" summary="Title, address and the words around the circle" accent="orange" defaultOpen>
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <Text label="Page title (the film's name)" value={page.title} onChange={v => setPage(p => ({ ...p, title: v, hero: { ...p.hero, title: p.hero.title === p.title ? v : p.hero.title } }))} />
                            <Text label="Big title on the page" value={page.hero.title} onChange={v => up('hero', { title: v })} hint="Usually the same as the title." />
                            <Text label="Top of the screen" value={page.hero.topMeta} onChange={v => up('hero', { topMeta: v })} placeholder="Empire Arena · Sat Feb 20" />
                            <Text label="Text spinning around the circle" value={page.hero.ringText} onChange={v => up('hero', { ringText: v })} placeholder="Ace Broadus · vs · Beast Johnson · " />
                            <Text label="Bottom-left line" value={page.hero.footLeft} onChange={v => up('hero', { footLeft: v })} />
                            <Text label="Bottom-right line" value={page.hero.footRight} onChange={v => up('hero', { footRight: v })} />
                        </div>
                        <Text label="Scrolling banner" value={page.marquee} onChange={v => setPage(p => ({ ...p, marquee: v }))} hint="Separate words with · (a dot). Leave empty to hide it." placeholder="Ace Broadus · VS · Beast Johnson · Empire Arena" />
                        <Notice>Address: <b>{pageUrl(slug)}</b> · also <b>{subUrl(slug)}</b> · partners page: <b>{pageUrl(slug)}/partners</b></Notice>
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-look`} title="The look" summary={`${PROMO_FONTS[page.look.font]?.label || ''} · colors · effects · which sections show`} accent="magenta">
                    <div className="space-y-5">
                        <Field label="Quick color sets">
                            <div className="flex flex-wrap gap-2">
                                {PROMO_LOOK_PRESETS.map(p => (
                                    <button key={p.id} type="button" onClick={() => up('look', p.colors)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0B0B0D] px-3 py-2 text-xs text-white hover:border-white/30">
                                        <span className="flex">{[p.colors.bg, p.colors.accent, p.colors.sideA, p.colors.sideB].map((c, i) => <span key={i} className="w-4 h-4 rounded-full -ml-1 first:ml-0 border border-black/40" style={{ background: c }} />)}</span>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {([['bg', 'Background'], ['ink', 'Text'], ['accent', 'Accent'], ['sideA', 'Left side'], ['sideB', 'Right side']] as const).map(([k, l]) => (
                                <Field key={k} label={l}>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={page.look[k]} onChange={e => up('look', { [k]: e.target.value } as any)} className="w-10 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                                        <span className="text-xs text-[#8A8A96] font-mono">{page.look[k]}</span>
                                    </div>
                                </Field>
                            ))}
                        </div>
                        <Field label="Title font">
                            <select className={inputClass} value={page.look.font} onChange={e => up('look', { font: e.target.value as PromoFont })}>
                                {Object.entries(PROMO_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
                            </select>
                        </Field>
                        <div className="grid sm:grid-cols-3 gap-2">
                            <Toggle label="Film grain" on={page.look.grain} onChange={v => up('look', { grain: v })} />
                            <Toggle label="Lens flare" on={page.look.flare} onChange={v => up('look', { flare: v })} />
                            <Toggle label="Movie-bars intro" on={page.look.letterbox} onChange={v => up('look', { letterbox: v })} />
                        </div>
                        <Field label="Sections on the page">
                            <div className="grid sm:grid-cols-3 gap-2">
                                <Toggle label="The two sides" on={page.sections.fight} onChange={v => up('sections', { fight: v })} />
                                <Toggle label="Countdown" on={page.sections.countdown} onChange={v => up('sections', { countdown: v })} />
                                <Toggle label="Pick a side vote" on={page.sections.vote} onChange={v => up('sections', { vote: v })} />
                                <Toggle label="Partners" on={page.sections.partners} onChange={v => up('sections', { partners: v })} />
                                <Toggle label="Instagram posts" on={page.sections.instagram} onChange={v => up('sections', { instagram: v })} />
                            </div>
                        </Field>
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-circle`} title="Pictures in the circle" summary={`${media.length} picture${media.length === 1 ? '' : 's'} · they play in this order`} accent="amber">
                    <p className="text-sm text-[#8A8A96] mb-3">Square close-ups of faces look best. Alternate the two sides to keep the face-off feel.</p>
                    <ListEditor<PromoMedia>
                        items={media} onChange={v => up('hero', { media: v })} addLabel="Add a picture or video" max={12}
                        blank={() => ({ type: 'image', src: '', pos: '50% 40%' })}
                        render={(m, set) => (
                            <div className="space-y-3">
                                <Upload slug={slug} label="Picture or short video" accept="image/*,video/mp4,video/quicktime,video/webm" value={m.src}
                                    onChange={(url, f) => set({ ...m, src: url, type: (f ? f.type.startsWith('video') : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) ? 'video' : 'image' })} />
                                <Field label="Which part of the picture to show">
                                    <div className="flex gap-2 flex-wrap">
                                        {POSITIONS.map(p => <Button key={p.pos} type="button" size="sm" variant={m.pos === p.pos ? 'primary' : 'secondary'} accent="amber" onClick={() => set({ ...m, pos: p.pos })}>{p.label}</Button>)}
                                    </div>
                                </Field>
                            </div>
                        )}
                    />
                </Disclosure>

                <Disclosure id={`promo-${slug}-sides`} title="The two sides" summary={`${page.sideA.first || '—'} vs ${page.sideB.first || '—'}`} accent="coral">
                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card><p className="text-sm font-bold mb-3" style={{ color: page.look.sideA }}>Left side</p><SideEditor slug={slug} label="Red corner" side={page.sideA} onChange={s => setPage(p => ({ ...p, sideA: s }))} /></Card>
                        <Card><p className="text-sm font-bold mb-3" style={{ color: page.look.sideB }}>Right side</p><SideEditor slug={slug} label="Blue corner" side={page.sideB} onChange={s => setPage(p => ({ ...p, sideB: s }))} /></Card>
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-countdown`} title="Countdown & reveal" summary={page.countdown.date ? `Counts down to ${new Date(page.countdown.date).toLocaleString()}` : 'No date set'} accent="violet">
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <Field label="Countdown ends (your time zone)" hint="When it hits zero, the page flips to the reveal by itself.">
                                <input type="datetime-local" className={inputClass} value={toLocalInput(page.countdown.date)}
                                    onChange={e => up('countdown', { date: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
                            </Field>
                            <div className="pt-6"><Toggle label="Show the reveal now" hint="Flip the page early, whatever the date" on={page.countdown.forceReveal} onChange={v => up('countdown', { forceReveal: v })} /></div>
                        </div>
                        <p className="text-sm font-bold text-white pt-2">Before the reveal</p>
                        <div className="grid sm:grid-cols-4 gap-3">
                            <Text label="Small line" value={page.countdown.eyebrow} onChange={v => up('countdown', { eyebrow: v })} />
                            <Text label="Headline" value={page.countdown.headline} onChange={v => up('countdown', { headline: v })} />
                            <Text label="Outlined words" value={page.countdown.outlined} onChange={v => up('countdown', { outlined: v })} />
                            <Text label="Email button" value={page.countdown.buttonText} onChange={v => up('countdown', { buttonText: v })} />
                        </div>
                        <p className="text-sm font-bold text-white pt-2">After the reveal</p>
                        <div className="grid sm:grid-cols-3 gap-3">
                            <Text label="Small line" value={page.countdown.revealEyebrow} onChange={v => up('countdown', { revealEyebrow: v })} />
                            <Text label="Headline" value={page.countdown.revealHeadline} onChange={v => up('countdown', { revealHeadline: v })} />
                            <Text label="Outlined words" value={page.countdown.revealOutlined} onChange={v => up('countdown', { revealOutlined: v })} />
                        </div>
                        <Upload slug={slug} label="Trailer (upload an MP4, or paste a YouTube / Vimeo link)" accept="video/mp4,video/quicktime,video/webm" value={page.countdown.trailerUrl} onChange={v => up('countdown', { trailerUrl: v })} />
                        <p className="text-sm font-bold text-white pt-2">Crowdfund (shows after the reveal)</p>
                        <div className="grid sm:grid-cols-3 gap-3">
                            <Text label="Small line" value={page.crowdfund.eyebrow} onChange={v => up('crowdfund', { eyebrow: v })} />
                            <Text label="Headline" value={page.crowdfund.headline} onChange={v => up('crowdfund', { headline: v })} />
                            <Text label="Outlined words" value={page.crowdfund.outlined} onChange={v => up('crowdfund', { outlined: v })} />
                        </div>
                        <Text label="What the money is for" long value={page.crowdfund.text} onChange={v => up('crowdfund', { text: v })} />
                        <Text label="Crowdfund link" value={page.crowdfund.link} onChange={v => up('crowdfund', { link: v })} placeholder="https://…" />
                        <ListEditor items={page.crowdfund.tiers} onChange={v => up('crowdfund', { tiers: v })} addLabel="Add a backer level" blank={() => ({ amount: '', name: '', text: '' })}
                            render={(t, set) => (
                                <div className="grid sm:grid-cols-3 gap-3">
                                    <Text label="Amount" value={t.amount} onChange={v => set({ ...t, amount: v })} placeholder="$60" />
                                    <Text label="Name" value={t.name} onChange={v => set({ ...t, name: v })} placeholder="Fight Tee" />
                                    <Text label="What they get" value={t.text} onChange={v => set({ ...t, text: v })} />
                                </div>
                            )} />
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-vote`} title="Pick a side & partners" summary="Vote headline, partner logos, contact" accent="sky">
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-3 gap-3">
                            <Text label="Vote: small line" value={page.vote.eyebrow} onChange={v => up('vote', { eyebrow: v })} />
                            <Text label="Vote: headline" value={page.vote.headline} onChange={v => up('vote', { headline: v })} />
                            <Text label="Vote: outlined words" value={page.vote.outlined} onChange={v => up('vote', { outlined: v })} />
                            <Text label="Partners: small line" value={page.partnersBlock.eyebrow} onChange={v => up('partnersBlock', { eyebrow: v })} />
                            <Text label="Partners: headline" value={page.partnersBlock.headline} onChange={v => up('partnersBlock', { headline: v })} />
                            <Text label="Partners: outlined words" value={page.partnersBlock.outlined} onChange={v => up('partnersBlock', { outlined: v })} />
                        </div>
                        <Text label="Partners: short pitch" long value={page.partnersBlock.text} onChange={v => up('partnersBlock', { text: v })} />
                        <Text label="Partner contact email" value={page.partnersBlock.email} onChange={v => up('partnersBlock', { email: v })} hint="Shows a 'Become a partner' button. Leave empty to hide it." />
                        <Field label="Partner logos" hint="With no logos, the page shows 'Your logo here' spots.">
                            <ListEditor items={page.partnersBlock.slots} onChange={v => up('partnersBlock', { slots: v })} addLabel="Add a partner" max={15} blank={() => ({ name: '', logo: '', link: '' })}
                                render={(s, set) => (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <div className="space-y-3">
                                            <Text label="Business name" value={s.name} onChange={v => set({ ...s, name: v })} />
                                            <Text label="Their website" value={s.link} onChange={v => set({ ...s, link: v })} placeholder="https://…" />
                                        </div>
                                        <Upload slug={slug} label="Logo (PNG with see-through background is best)" value={s.logo} onChange={v => set({ ...s, logo: v })} />
                                    </div>
                                )} />
                        </Field>
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-ig`} title="Instagram" summary={page.instagram.posts.length ? `${page.instagram.posts.length} post${page.instagram.posts.length === 1 ? '' : 's'} on the page` : 'Paste post links to show them'} accent="magenta">
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <Text label="Handle" value={page.instagram.handle} onChange={v => up('instagram', { handle: v })} placeholder="thechampmovie" />
                            <Text label="Profile link" value={page.instagram.url} onChange={v => up('instagram', { url: v })} placeholder="https://instagram.com/…" />
                        </div>
                        <Field label="Posts to show (one link per line)" hint="Open the post on Instagram → ⋯ → Copy link. Turn on 'Instagram posts' in The look.">
                            <textarea className={`${inputClass} min-h-[110px] font-mono text-xs`} value={page.instagram.posts.join('\n')}
                                onChange={e => up('instagram', { posts: e.target.value.split('\n') as any })}
                                onBlur={e => up('instagram', { posts: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) as any })} />
                        </Field>
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-footer`} title="Bottom of the page" summary={page.footer.credit} accent="gray">
                    <div className="grid sm:grid-cols-2 gap-3">
                        <Text label="Line 1" value={page.footer.line1} onChange={v => up('footer', { line1: v })} />
                        <Text label="Line 2" value={page.footer.line2} onChange={v => up('footer', { line2: v })} />
                        <Text label="Press email" value={page.footer.pressEmail} onChange={v => up('footer', { pressEmail: v })} />
                        <Text label="Credit line" value={page.footer.credit} onChange={v => up('footer', { credit: v })} />
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-pp`} title="Private partners page" summary={page.partnerPage.enabled ? `On · ${pageUrl(slug)}/partners` : 'Off'} accent="green">
                    <div className="space-y-5">
                        <Toggle label="Partners page is on" hint="Not linked anywhere; you send the link to companies. Search engines skip it." on={page.partnerPage.enabled} onChange={v => up('partnerPage', { enabled: v })} />
                        <div className="grid sm:grid-cols-2 gap-3">
                            <Text label="Headline" value={page.partnerPage.headline} onChange={v => up('partnerPage', { headline: v })} />
                            <Text label="Outlined words" value={page.partnerPage.outlined} onChange={v => up('partnerPage', { outlined: v })} />
                        </div>
                        <Text label="What this is (say plainly it's a film)" long value={page.partnerPage.intro} onChange={v => up('partnerPage', { intro: v })} />
                        <Field label="How it works (timeline)">
                            <ListEditor items={page.partnerPage.steps} onChange={v => up('partnerPage', { steps: v })} addLabel="Add a step" max={8} blank={() => ({ when: '', title: '', text: '', key: false })}
                                render={(s, set) => (
                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <Text label="When" value={s.when} onChange={v => set({ ...s, when: v })} />
                                        <Text label="Title" value={s.title} onChange={v => set({ ...s, title: v })} />
                                        <Text label="Text" value={s.text} onChange={v => set({ ...s, text: v })} />
                                        <Toggle label="Highlight this step" on={s.key} onChange={v => set({ ...s, key: v })} />
                                    </div>
                                )} />
                        </Field>
                        <Field label="Where their brand shows up">
                            <ListEditor items={page.partnerPage.places} onChange={v => up('partnerPage', { places: v })} addLabel="Add a place" max={12} blank={() => ({ title: '', text: '' })}
                                render={(s, set) => (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <Text label="Where" value={s.title} onChange={v => set({ ...s, title: v })} />
                                        <Text label="Details" value={s.text} onChange={v => set({ ...s, text: v })} />
                                    </div>
                                )} />
                        </Field>
                        <Field label="Packages">
                            <ListEditor items={page.partnerPage.packs} onChange={v => up('partnerPage', { packs: v })} addLabel="Add a package" max={6} blank={() => ({ tag: '', name: '', price: '', spots: '', perks: [], top: false })}
                                render={(s, set) => (
                                    <div className="space-y-3">
                                        <div className="grid sm:grid-cols-4 gap-3">
                                            <Text label="Name" value={s.name} onChange={v => set({ ...s, name: v })} />
                                            <Text label="Price" value={s.price} onChange={v => set({ ...s, price: v })} />
                                            <Text label="Spots" value={s.spots} onChange={v => set({ ...s, spots: v })} placeholder="2 spots" />
                                            <Text label="Little tag" value={s.tag} onChange={v => set({ ...s, tag: v })} placeholder="Only one" />
                                        </div>
                                        <Field label="What they get (one per line)">
                                            <textarea className={`${inputClass} min-h-[90px]`} value={s.perks.join('\n')} onChange={e => set({ ...s, perks: e.target.value.split('\n') })} />
                                        </Field>
                                        <Toggle label="Make this the featured package" on={s.top} onChange={v => set({ ...s, top: v })} />
                                    </div>
                                )} />
                        </Field>
                        <Text label="Note under the packages" long value={page.partnerPage.packsNote} onChange={v => up('partnerPage', { packsNote: v })} />
                        <Field label="The team">
                            <ListEditor items={page.partnerPage.team} onChange={v => up('partnerPage', { team: v })} addLabel="Add a person" max={16} blank={() => ({ role: '', name: '', text: '', photo: '' })}
                                render={(s, set) => (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <div className="space-y-3">
                                            <Text label="Role" value={s.role} onChange={v => set({ ...s, role: v })} />
                                            <Text label="Name" value={s.name} onChange={v => set({ ...s, name: v })} />
                                            <Text label="One line about them" value={s.text} onChange={v => set({ ...s, text: v })} />
                                        </div>
                                        <Upload slug={slug} label="Headshot" round value={s.photo} onChange={v => set({ ...s, photo: v })} />
                                    </div>
                                )} />
                        </Field>
                        <Field label="Numbers (real ones only — empty shows a dash)">
                            <ListEditor items={page.partnerPage.stats} onChange={v => up('partnerPage', { stats: v })} addLabel="Add a number" max={8} blank={() => ({ n: '', label: '', note: '' })}
                                render={(s, set) => (
                                    <div className="grid sm:grid-cols-3 gap-3">
                                        <Text label="Number" value={s.n} onChange={v => set({ ...s, n: v })} placeholder="12.4k" />
                                        <Text label="Label" value={s.label} onChange={v => set({ ...s, label: v })} />
                                        <Text label="Small note" value={s.note} onChange={v => set({ ...s, note: v })} />
                                    </div>
                                )} />
                        </Field>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <Text label="Contact email" value={page.partnerPage.contactEmail} onChange={v => up('partnerPage', { contactEmail: v })} />
                            <Text label="Contact phone (optional)" value={page.partnerPage.contactPhone} onChange={v => up('partnerPage', { contactPhone: v })} />
                        </div>
                        <Card>
                            <p className="text-white font-bold mb-1">"I'm interested" form</p>
                            <p className="text-sm text-[#8A8A96] mb-4">Businesses pick a package and leave their name, business and phone or email. Each answer is <b className="text-white">emailed to the Contact email above</b>, and hitting Reply writes back to them. Nothing is saved in CRATE.</p>
                            <div className="space-y-3">
                                <Toggle label="Show the form" on={page.partnerPage.form.enabled} onChange={v => up('partnerPage', { form: { ...page.partnerPage.form, enabled: v } })} />
                                {page.partnerPage.form.enabled && !page.partnerPage.contactEmail.trim() && <Notice tone="warn">Add the Contact email above. The form stays hidden until there's somewhere to send it.</Notice>}
                                <div className="grid sm:grid-cols-3 gap-3">
                                    <Text label="Headline" value={page.partnerPage.form.headline} onChange={v => up('partnerPage', { form: { ...page.partnerPage.form, headline: v } })} />
                                    <Text label="Outlined words" value={page.partnerPage.form.outlined} onChange={v => up('partnerPage', { form: { ...page.partnerPage.form, outlined: v } })} />
                                    <Text label="Button" value={page.partnerPage.form.button} onChange={v => up('partnerPage', { form: { ...page.partnerPage.form, button: v } })} />
                                </div>
                                <Text label="Line under the headline" value={page.partnerPage.form.text} onChange={v => up('partnerPage', { form: { ...page.partnerPage.form, text: v } })} />
                            </div>
                        </Card>
                        <Button type="button" onClick={() => setPreview('partners')}>👁 Preview partners page</Button>
                    </div>
                </Disclosure>

                <Disclosure id={`promo-${slug}-entries`} title="Votes & sign-ups" summary="Who picked a side and who signed up for updates" accent="green">
                    {!entries ? <Button onClick={loadEntries}>Show votes & sign-ups</Button> : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <StatTile compact label={`Picked ${page.sideA.first || 'left'}`} value={entries.counts.votesA} accent="coral" />
                                <StatTile compact label={`Picked ${page.sideB.first || 'right'}`} value={entries.counts.votesB} accent="sky" />
                                <StatTile compact label="Emails" value={entries.counts.signups} accent="green" />
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={async () => setMsg((await copyText(entries.entries.map(e => e.email).join(', '))) ? { tone: 'success', text: 'Emails copied.' } : { tone: 'error', text: 'Could not copy.' })}>Copy all emails</Button>
                                <Button size="sm" onClick={downloadCsv}>Download spreadsheet (CSV)</Button>
                                <Button size="sm" variant="ghost" onClick={loadEntries}>Refresh</Button>
                            </div>
                            <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {entries.entries.map((e, i) => (
                                            <tr key={i} className="border-b border-white/5">
                                                <td className="px-3 py-2 text-white">{e.email}</td>
                                                <td className="px-3 py-2 text-[#A1A1AD]">{e.side === 'a' ? page.sideA.first : e.side === 'b' ? page.sideB.first : '—'}</td>
                                                <td className="px-3 py-2 text-[#5A5A66] text-xs">{shortDate(e.createdAt)}</td>
                                            </tr>
                                        ))}
                                        {!entries.entries.length && <tr><td className="px-3 py-6 text-center text-[#8A8A96]">Nobody yet.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Disclosure>

                <Card>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="text-white font-bold">Fill with The Champ</p>
                            <p className="text-sm text-[#8A8A96]">Replaces everything on this page with The Champ's words, photos and stats. Nothing changes until you press Save.</p>
                        </div>
                        <Button onClick={() => setPage(p => ({ ...theChampExample(p.slug), title: p.title, published: p.published }))}>Fill with The Champ</Button>
                    </div>
                </Card>

                <Card>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <p className="text-white font-bold">Delete this page</p>
                            <p className="text-sm text-[#8A8A96]">Removes this film's page, votes and sign-ups. The Fight Night design stays for the next film.</p>
                        </div>
                        <Button variant="danger" onClick={() => { setDeleteText(''); setConfirmDelete(true); }}>Delete page</Button>
                    </div>
                </Card>
            </div>

            {confirmDelete && (
                <Modal title="Delete this promo page?" onClose={() => setConfirmDelete(false)}>
                    <p className="text-sm text-[#C9C9D1] mb-4">This can't be undone. Type <b className="text-white">{slug}</b> to confirm.</p>
                    <input className={inputClass} value={deleteText} onChange={e => setDeleteText(e.target.value)} autoFocus />
                    <div className="flex justify-end gap-2 mt-5">
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        <Button variant="danger" disabled={busy || deleteText.trim() !== slug} onClick={remove}>Delete forever</Button>
                    </div>
                </Modal>
            )}

            {preview && (
                <div className="fixed inset-0 z-[200] bg-black">
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[300] flex gap-1 rounded-full bg-[#16161C]/95 border border-white/10 p-1 shadow-2xl">
                        {(['site', 'reveal', 'partners'] as const).map(v => (
                            <button key={v} onClick={() => { setPreview(v); scroller?.scrollTo(0, 0); }} className={`px-3 py-1.5 rounded-full text-xs font-bold ${preview === v ? 'bg-white text-black' : 'text-white'}`}>
                                {v === 'site' ? 'Page' : v === 'reveal' ? 'After the reveal' : 'Partners page'}
                            </button>
                        ))}
                        <button onClick={() => setPreview(null)} className="px-3 py-1.5 rounded-full text-xs font-bold text-[#FF6B85]">Close ✕</button>
                    </div>
                    <div ref={setScroller} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
                        {preview === 'partners'
                            ? <PromoPartnersView key="pv" page={previewPage} onInterest={async () => { throw new Error('This is a preview, so nothing was sent. The form works once the page is live.'); }} />
                            : <FightNightTemplate key={preview} page={previewPage} scroller={scroller} counts={{ votesA: 0, votesB: 0 }}
                                actions={{ submit: async () => { throw new Error('This is a preview — votes work once the page is live.'); } }} />}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── List of pages + create ──────────────────────────────────────────────────
const PromoPagesTab: React.FC = () => {
    const [list, setList] = useState<Summary[] | null>(null);
    const [err, setErr] = useState('');
    const [editing, setEditing] = useState<PromoPage | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: '', slug: '', start: 'blank' as string });
    const [slugTouched, setSlugTouched] = useState(false);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState('');

    const load = () => adminPost<{ pages: Summary[] }>(API, { action: 'list' }).then(r => setList(r.pages)).catch(e => setErr(e?.message || 'Could not load promo pages.'));
    useEffect(() => { load(); }, []);

    const open = async (slug: string) => {
        setErr('');
        try { setEditing((await adminPost<{ page: PromoPage }>(API, { action: 'get', slug })).page); } catch (e: any) { setErr(e?.message || 'Could not open it.'); }
    };
    const slug = slugTouched ? form.slug : promoSlugify(form.title);
    const problem = slug ? slugProblem(slug) : null;
    const create = async () => {
        setBusy(true); setErr('');
        try {
            const body: Record<string, unknown> = form.start.startsWith('copy:')
                ? { action: 'duplicate', from: form.start.slice(5), title: form.title, slug }
                : { action: 'create', title: form.title, slug, example: form.start === 'champ' ? 'champ' : undefined };
            const r = await adminPost<{ page: PromoPage }>(API, body);
            setCreating(false); setForm({ title: '', slug: '', start: 'blank' }); setSlugTouched(false);
            load(); setEditing(r.page);
        } catch (e: any) { setErr(e?.message || 'Could not create it.'); }
        finally { setBusy(false); }
    };

    if (editing) return <PromoEditor key={editing.slug} initial={editing} onBack={() => { setEditing(null); load(); }} onChanged={load} />;

    return (
        <div>
            <PageHeader title="Promo pages" accent="orange"
                subtitle="A cinematic promo site for a film: giant title, picture circle, countdown, pick-a-side vote, partners, and a private page for sponsors. Edit everything here — no code."
                actions={<Button variant="primary" accent="orange" onClick={() => setCreating(true)}>+ New promo page</Button>} />
            {err && <div className="mb-4"><Notice tone="error">{err}</Notice></div>}
            {!list ? <p className="text-[#8A8A96]">Loading…</p> : !list.length ? (
                <EmptyState icon="🥊" title="No promo pages yet" text="Start one for a film. Start from The Champ — words, photos and stats all filled in — or start blank." action={<Button variant="primary" accent="orange" onClick={() => setCreating(true)}>+ New promo page</Button>} />
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {list.map(p => (
                        <Card key={p.slug}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-lg font-black text-white truncate">{p.title}</p>
                                    <p className="text-xs text-[#8A8A96] font-mono truncate">cratetv.net/p/{p.slug}</p>
                                </div>
                                {p.published ? <Pill accent="green" solid>Live</Pill> : <Pill>Draft</Pill>}
                            </div>
                            <p className="text-sm text-[#A1A1AD] mt-3">{p.votesA + p.votesB} votes · {p.signups} emails · edited {shortDate(p.updatedAt)}</p>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Button size="sm" variant="primary" accent="orange" onClick={() => open(p.slug)}>Edit</Button>
                                {p.published && <a className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-xl bg-white/[0.06] text-white border border-white/10" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">Open page ↗</a>}
                                <Button size="sm" variant="ghost" onClick={async () => { if (await copyText(`${pageUrl(p.slug)}/partners`)) { setCopied(p.slug); setTimeout(() => setCopied(''), 2000); } }}>
                                    {copied === p.slug ? 'Copied ✓' : 'Copy partners link'}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {creating && (
                <Modal title="New promo page" onClose={() => setCreating(false)}>
                    <div className="space-y-4">
                        <Text label="Film name" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="The Champ" />
                        <Field label="Address" hint={problem || `cratetv.net/p/${slug || '…'}  ·  ${slug || '…'}.cratetv.net`}>
                            <input className={inputClass} value={slug} onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: promoSlugify(e.target.value) })); }} placeholder="the-champ" />
                        </Field>
                        <Field label="Start from">
                            <select className={inputClass} value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}>
                                <option value="blank">Blank Fight Night page</option>
                                <option value="champ">The Champ (everything: words, photos, stats)</option>
                                {(list || []).map(p => <option key={p.slug} value={`copy:${p.slug}`}>A copy of “{p.title}”</option>)}
                            </select>
                        </Field>
                        {err && <Notice tone="error">{err}</Notice>}
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                            <Button variant="primary" accent="orange" disabled={busy || !form.title.trim() || !slug || !!problem} onClick={create}>{busy ? 'Creating…' : 'Create page'}</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PromoPagesTab;
