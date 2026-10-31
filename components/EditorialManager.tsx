import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EditorialStory, Movie, ZineSection } from '../types';
import LoadingSpinner from './LoadingSpinner';
import S3Uploader from './S3Uploader';
import ZineArticleBody, { zineImg, SERIF } from './zine/ZineArticleBody';
import { STORY_TEMPLATES, BLANK_TEMPLATE, SERIES_IDEAS, sectionsFromTemplate, newSectionId, templateById, StoryTemplate } from './zine/templates';
import { STORY_TYPE_LABELS, storyChecklist, readingMinutes, storyWords, isPublishedStory, typeLabel, PartnerPiece } from '../api/_lib/zineRules';

// EDITORIAL: where you write The Unpack (the zine). Pick a template, fill in the
// blocks, check the "ready to publish?" list, and publish. Drafts are private.

interface Props { allMovies: Record<string, Movie>; }

interface Submission { id: string; partnerName: string; piece: PartnerPiece; submittedAt?: string; }

type FormStory = Omit<EditorialStory, 'id' | 'content'> & { id?: string; content?: string };

const blankForm = (): FormStory => ({
    title: '', subtitle: '', heroImage: '', author: '', type: 'SPOTLIGHT', sections: [], linkedMovieKey: '', template: 'blank', status: 'draft',
});

const BLOCK_BUTTONS: { type: ZineSection['type']; label: string }[] = [
    { type: 'text', label: 'Paragraph' }, { type: 'header', label: 'Heading' }, { type: 'quote', label: 'Pull quote' },
    { type: 'callout', label: 'Note box' }, { type: 'image', label: 'Picture' }, { type: 'gallery', label: 'Picture set' },
    { type: 'film', label: 'Film card' }, { type: 'video', label: 'Video' },
];
const BLOCK_NAMES: Record<ZineSection['type'], string> = {
    text: 'Paragraph', header: 'Heading', quote: 'Pull quote', callout: 'Note box', image: 'Picture', gallery: 'Picture set', film: 'Film card', video: 'Video',
};

const field = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40';
const lab = 'block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5';
const panel = 'bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 md:p-7';
const btn = 'rounded-xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed';

const dateOf = (s: any) => s?.publishedAt?.seconds ? new Date(s.publishedAt.seconds * 1000) : s?.publishedAt?._seconds ? new Date(s.publishedAt._seconds * 1000) : null;

async function callZine<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch('/api/admin-zine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionStorage.getItem('adminPassword'), action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

const EditorialManager: React.FC<Props> = ({ allMovies }) => {
    const [stories, setStories] = useState<EditorialStory[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'home' | 'editor'>('home');
    const [tab, setTab] = useState<'drafts' | 'published'>('drafts');
    const [form, setForm] = useState<FormStory>(blankForm());
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [openSub, setOpenSub] = useState<string | null>(null);
    const [returnNote, setReturnNote] = useState('');

    const load = useCallback(async () => {
        try {
            const [s, sub] = await Promise.all([callZine<{ stories: EditorialStory[] }>('listStories'), callZine<{ submissions: Submission[] }>('listSubmissions')]);
            setStories(s.stories.sort((a, b) => (dateOf(b)?.getTime() || 0) - (dateOf(a)?.getTime() || 0)));
            setSubmissions(sub.submissions);
        } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!dirty) return;
        const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', h);
        return () => window.removeEventListener('beforeunload', h);
    }, [dirty]);

    const drafts = useMemo(() => stories.filter(s => !isPublishedStory(s)), [stories]);
    const published = useMemo(() => stories.filter(isPublishedStory), [stories]);
    const check = useMemo(() => storyChecklist(form), [form]);
    const tpl: StoryTemplate | undefined = templateById(form.template);
    const movieList = useMemo(() => (Object.values(allMovies || {}) as Movie[]).filter(m => m?.title).sort((a, b) => a.title.localeCompare(b.title)), [allMovies]);
    const isLive = form.status === 'published' && !!form.id;

    const patch = (p: Partial<FormStory>) => { setForm(f => ({ ...f, ...p })); setDirty(true); setMsg(null); };
    const patchSection = (id: string, p: Partial<ZineSection>) => patch({ sections: (form.sections || []).map(s => s.id === id ? { ...s, ...p } : s) });
    const move = (i: number, dir: -1 | 1) => {
        const list = [...(form.sections || [])]; const j = i + dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]]; patch({ sections: list });
    };
    const addBlock = (type: ZineSection['type']) => patch({ sections: [...(form.sections || []), { id: newSectionId(), type, content: '', ...(type === 'callout' ? { label: 'A note' } : {}) }] });

    const startFrom = (t: StoryTemplate) => {
        setForm({ ...blankForm(), type: t.type, template: t.id, sections: sectionsFromTemplate(t), author: 'Crate Editorial' });
        setDirty(false); setMsg(null); setView('editor'); window.scrollTo(0, 0);
    };
    const edit = (s: EditorialStory) => {
        setForm({ ...s, sections: (s.sections && s.sections.length ? s.sections : s.content ? [{ id: newSectionId(), type: 'text' as const, content: s.content }] : []).map(x => ({ ...x })) });
        setDirty(false); setMsg(null); setView('editor'); window.scrollTo(0, 0);
    };
    const leave = () => {
        if (dirty && !window.confirm('You have changes that are not saved. Leave anyway?')) return;
        setDirty(false); setView('home'); setMsg(null); load();
    };

    const save = async (publish?: boolean) => {
        setBusy(true); setMsg(null);
        try {
            const res = await callZine<{ id: string; status: string }>('saveStory', { story: form, publish });
            setForm(f => ({ ...f, id: res.id, status: res.status as 'draft' | 'published' }));
            setDirty(false);
            setMsg({ ok: true, text: res.status === 'published' ? (publish ? 'Published! It is live on The Unpack.' : 'Saved. Your changes are live.') : 'Draft saved. Only you can see it.' });
            load();
        } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setBusy(false); }
    };
    const publish = () => {
        if (check.errors.length) { setMsg({ ok: false, text: 'Not ready yet. See the checklist below.' }); return; }
        if (window.confirm('Publish this story on The Unpack now?')) save(true);
    };
    const unpublish = async () => {
        if (!form.id || !window.confirm('Take this story off The Unpack and turn it back into a draft?')) return;
        setBusy(true);
        try { await callZine('unpublish', { id: form.id }); setForm(f => ({ ...f, status: 'draft' })); setMsg({ ok: true, text: 'Taken down. It is a draft again.' }); load(); }
        catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        if (!form.id || !window.confirm('Delete this story for good? This can not be undone.')) return;
        setBusy(true);
        try { await callZine('deleteStory', { id: form.id }); setDirty(false); setView('home'); load(); }
        catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setBusy(false); }
    };

    const accept = async (id: string) => {
        setBusy(true);
        try { const r = await callZine<{ storyId: string }>('acceptSubmission', { id }); await load(); setOpenSub(null); setMsg({ ok: true, text: 'Accepted. It is now a draft in your list. Edit it, then publish.' }); setTab('drafts'); void r; }
        catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setBusy(false); }
    };
    const sendBack = async (id: string) => {
        setBusy(true);
        try { await callZine('returnSubmission', { id, note: returnNote }); setReturnNote(''); setOpenSub(null); await load(); setMsg({ ok: true, text: 'Sent back to the partner with your note.' }); }
        catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setBusy(false); }
    };

    if (loading) return <LoadingSpinner />;

    // ───────────────────────── HOME ─────────────────────────
    if (view === 'home') {
        const list = tab === 'drafts' ? drafts : published;
        return (
            <div className="space-y-10 pb-24">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-8">
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: SERIF }}>Write for The Unpack</h2>
                        <p className="text-gray-400 mt-2 max-w-xl">The Unpack is your magazine. Pick a starting point below, write, check the list, and publish. Drafts stay private until you press Publish.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className={`${btn} bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10`} onClick={() => setShowGuide(!showGuide)}>{showGuide ? 'Hide writing guide' : 'Writing guide'}</button>
                        <a href="/zine" target="_blank" rel="noreferrer" className={`${btn} bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10`}>View the zine ↗</a>
                    </div>
                </div>

                {msg && <p className={`text-sm rounded-xl px-4 py-3 border ${msg.ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-red-300 bg-red-500/10 border-red-500/20'}`}>{msg.text}</p>}

                {showGuide && (
                    <div className={`${panel} grid md:grid-cols-2 gap-10`}>
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-white" style={{ fontFamily: SERIF }}>How we write</h3>
                            <ul className="space-y-3 text-gray-300 text-sm leading-relaxed list-disc pl-5">
                                <li><strong className="text-white">Sound like a person.</strong> Short sentences. Say what you saw and how it felt. Read it out loud: if you would not say it, change it.</li>
                                <li><strong className="text-white">Start in the middle.</strong> Open with a moment, a line from the film, or a detail, not with background.</li>
                                <li><strong className="text-white">Be specific.</strong> Name the scene, the street, the person. Words like "amazing" and "powerful" say nothing.</li>
                                <li><strong className="text-white">Pictures matter.</strong> A cover picture on every story. Caption and credit every photo. Wide, bright, people in them.</li>
                                <li><strong className="text-white">Get permission.</strong> Ask before you quote someone, name them, or use their pictures. Filmmakers see a draft first.</li>
                                <li><strong className="text-white">Send people to watch.</strong> End every film story with a film card.</li>
                                <li><strong className="text-white">Check before publishing.</strong> The list in the editor catches the common misses. Fix the red ones, read the yellow ones.</li>
                            </ul>
                            <p className="text-xs text-gray-500">Headlines under 70 characters. A one-line summary under every headline. Stories of 300 to 800 words are plenty.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-white" style={{ fontFamily: SERIF }}>Ideas you can come back to</h3>
                            <ul className="space-y-3">
                                {SERIES_IDEAS.map(i => (
                                    <li key={i.name} className="text-sm">
                                        <p className="font-bold text-white">{i.name}</p>
                                        <p className="text-gray-400">{i.idea}</p>
                                        <p className="text-[11px] text-gray-600 mt-0.5">{i.how}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {submissions.length > 0 && (
                    <section className="space-y-4">
                        <h3 className="text-xl font-black text-white" style={{ fontFamily: SERIF }}>Waiting for you <span className="ml-2 text-sm bg-red-600 text-white rounded-full px-2.5 py-0.5 align-middle">{submissions.length}</span></h3>
                        <p className="text-sm text-gray-400">Festival partners wrote these. Accepting one makes a draft for you to edit; nothing goes live until you publish it.</p>
                        {submissions.map(s => (
                            <div key={s.id} className={`${panel} space-y-4`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-bold text-white">{s.piece.title}</p>
                                        <p className="text-sm text-gray-400">{s.partnerName} · by {s.piece.byline}{s.piece.role ? `, ${s.piece.role}` : ''} · {s.piece.body.trim().split(/\s+/).length} words · {s.piece.photos.length} pictures</p>
                                    </div>
                                    <button className={`${btn} bg-white/5 border border-white/10 text-gray-200`} onClick={() => setOpenSub(openSub === s.id ? null : s.id)}>{openSub === s.id ? 'Close' : 'Read it'}</button>
                                </div>
                                {openSub === s.id && (
                                    <div className="space-y-5">
                                        {s.piece.deck && <p className="text-gray-300 italic">{s.piece.deck}</p>}
                                        <div className="bg-white/5 rounded-2xl p-5 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">{s.piece.body}</div>
                                        {s.piece.pullQuote && <p className="text-gray-300 text-sm">Pull quote: “{s.piece.pullQuote}”</p>}
                                        <div className="flex gap-3 flex-wrap">{s.piece.photos.map(p => <figure key={p.url} className="w-32"><img src={zineImg(p.url, 300)} alt="" className="w-32 h-24 object-cover rounded-lg" /><figcaption className="text-[11px] text-gray-500 mt-1">{p.caption}{p.credit ? ` · ${p.credit}` : ''}</figcaption></figure>)}</div>
                                        <div className="grid md:grid-cols-2 gap-4 pt-2">
                                            <button disabled={busy} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`} onClick={() => accept(s.id)}>Accept and make a draft</button>
                                            <div className="space-y-2">
                                                <textarea className={field} rows={3} placeholder="Note for the partner: what should they change?" value={returnNote} onChange={e => setReturnNote(e.target.value)} />
                                                <button disabled={busy || !returnNote.trim()} className={`${btn} bg-white/5 border border-white/10 text-gray-200 w-full`} onClick={() => sendBack(s.id)}>Send back with this note</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                <section className="space-y-5">
                    <h3 className="text-xl font-black text-white" style={{ fontFamily: SERIF }}>Start a new story</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[...STORY_TEMPLATES, BLANK_TEMPLATE].map(t => (
                            <button key={t.id} onClick={() => startFrom(t)} className="text-left bg-[#0f0f0f] hover:bg-white/[0.04] border border-white/5 hover:border-red-600/40 rounded-3xl p-6 transition-all group">
                                <span className="text-3xl">{t.icon}</span>
                                <p className="mt-3 text-lg font-bold text-white group-hover:text-red-400" style={{ fontFamily: SERIF }}>{t.name}</p>
                                <p className="text-sm text-gray-400 mt-1 leading-snug">{t.tagline}</p>
                                <p className="text-[11px] text-gray-600 mt-3 uppercase tracking-wider font-bold">{t.length}</p>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        {([['drafts', `Drafts (${drafts.length})`], ['published', `Published (${published.length})`]] as const).map(([id, name]) => (
                            <button key={id} onClick={() => setTab(id)} className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border ${tab === id ? 'bg-white text-black border-white' : 'border-white/10 text-gray-400 hover:text-white'}`}>{name}</button>
                        ))}
                    </div>
                    {list.length === 0 ? (
                        <p className="text-gray-500 text-sm py-8">{tab === 'drafts' ? 'No drafts. Pick a starting point above and begin.' : 'Nothing published yet.'}</p>
                    ) : (
                        <div className="space-y-2">
                            {list.map(s => (
                                <button key={s.id} onClick={() => edit(s)} className="w-full text-left bg-[#0f0f0f] hover:bg-white/[0.04] border border-white/5 rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-white truncate">{s.title || 'Untitled story'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{typeLabel(s.type)} · {s.author || 'no byline'} · {readingMinutes(s)} min read{dateOf(s) ? ` · ${dateOf(s)!.toLocaleDateString()}` : ''}</p>
                                    </div>
                                    {s.partnerName && <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 rounded-full px-3 py-1">{s.partnerName}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        );
    }

    // ───────────────────────── EDITOR ─────────────────────────
    const sections = form.sections || [];
    return (
        <div className="pb-32 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur py-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button className="text-sm font-bold text-gray-400 hover:text-white" onClick={leave}>← All stories</button>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isLive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>{isLive ? 'Published' : 'Draft'}</span>
                    {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {isLive && <a href={`/zine/${form.id}`} target="_blank" rel="noreferrer" className={`${btn} bg-white/5 border border-white/10 text-gray-200`}>View live ↗</a>}
                    <button disabled={busy} className={`${btn} bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10`} onClick={() => save()}>{busy ? 'Saving…' : isLive ? 'Save changes' : 'Save draft'}</button>
                    {isLive
                        ? <button disabled={busy} className={`${btn} bg-white/5 border border-white/10 text-gray-300`} onClick={unpublish}>Take down</button>
                        : <button disabled={busy} className={`${btn} bg-red-600 hover:bg-red-500 text-white`} onClick={publish}>Publish</button>}
                </div>
            </div>

            {msg && <p className={`text-sm rounded-xl px-4 py-3 border ${msg.ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-red-300 bg-red-500/10 border-red-500/20'}`}>{msg.text}</p>}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                {/* Writing side */}
                <div className="space-y-6">
                    {tpl && tpl.id !== 'blank' && (
                        <details className={`${panel} group`} open={!form.id}>
                            <summary className="cursor-pointer list-none flex items-center justify-between">
                                <span className="font-bold text-white"><span className="mr-2">{tpl.icon}</span>How to write a {tpl.name.toLowerCase()}</span>
                                <span className="text-xs text-gray-500 group-open:hidden">Show tips</span>
                            </summary>
                            <div className="mt-4 space-y-3 text-sm text-gray-300">
                                <p><strong className="text-white">Length:</strong> {tpl.length}. <strong className="text-white">Good for:</strong> {tpl.whenToUse}</p>
                                <ul className="list-disc pl-5 space-y-1.5">{tpl.tips.map(t => <li key={t}>{t}</li>)}</ul>
                            </div>
                        </details>
                    )}

                    <section className={`${panel} space-y-5`}>
                        <h3 className="text-lg font-black text-white" style={{ fontFamily: SERIF }}>The basics</h3>
                        <div>
                            <label className={lab}>Headline <span className="normal-case text-gray-600 font-normal">({form.title.length}/70)</span></label>
                            <input className={`${field} text-lg font-bold`} value={form.title} onChange={e => patch({ title: e.target.value })} placeholder="A clear, specific headline" />
                        </div>
                        <div>
                            <label className={lab}>One-line summary</label>
                            <input className={field} value={form.subtitle} onChange={e => patch({ subtitle: e.target.value })} placeholder="Shows under the headline and when the story is shared" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className={lab}>Written by</label>
                                <input className={field} value={form.author} onChange={e => patch({ author: e.target.value })} placeholder="Your name" />
                            </div>
                            <div>
                                <label className={lab}>Kind of story</label>
                                <select className={field} value={form.type} onChange={e => patch({ type: e.target.value as EditorialStory['type'] })}>
                                    {Object.entries(STORY_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={lab}>Cover picture</label>
                            <div className="flex flex-wrap items-center gap-4">
                                {form.heroImage && <img src={zineImg(form.heroImage, 300)} alt="" className="w-28 h-20 object-cover rounded-lg border border-white/10" />}
                                <S3Uploader label={form.heroImage ? 'Replace cover' : 'Upload cover'} onUploadSuccess={url => patch({ heroImage: url })} />
                            </div>
                            <input className={`${field} mt-3 text-xs`} value={form.heroImage} onChange={e => patch({ heroImage: e.target.value })} placeholder="…or paste a picture address" />
                        </div>
                        <div>
                            <label className={lab}>Film this story is about (optional)</label>
                            <select className={field} value={form.linkedMovieKey || ''} onChange={e => patch({ linkedMovieKey: e.target.value })}>
                                <option value="">None</option>
                                {movieList.map(m => <option key={m.key} value={m.key}>{m.title}</option>)}
                            </select>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-lg font-black text-white" style={{ fontFamily: SERIF }}>The story <span className="text-sm font-normal text-gray-500">· {storyWords(form)} words · {readingMinutes(form)} min read</span></h3>
                        {sections.length === 0 && <p className="text-sm text-gray-500">Nothing here yet. Add a paragraph to begin.</p>}
                        {sections.map((s, i) => (
                            <div key={s.id} className={`${panel} space-y-3`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-red-400">{BLOCK_NAMES[s.type]}</span>
                                    <div className="flex items-center gap-1 text-xs">
                                        <button className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-20" disabled={i === 0} onClick={() => move(i, -1)}>↑ Up</button>
                                        <button className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-20" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>↓ Down</button>
                                        <button className="px-2 py-1 text-gray-500 hover:text-red-400" onClick={() => patch({ sections: sections.filter(x => x.id !== s.id) })}>Delete</button>
                                    </div>
                                </div>
                                {s.hint && !s.content && <p className="text-sm text-indigo-300 italic leading-snug">{s.hint}</p>}

                                {(s.type === 'text' || s.type === 'quote') && (
                                    <textarea className={`${field} leading-relaxed`} rows={s.type === 'text' ? 7 : 3} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })} placeholder={s.type === 'text' ? 'Write here. A blank line starts a new paragraph.' : 'The quote, without quotation marks'} />
                                )}
                                {s.type === 'header' && <input className={`${field} font-bold`} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })} placeholder="Heading" />}
                                {s.type === 'callout' && (
                                    <>
                                        <input className={field} value={s.label || ''} onChange={e => patchSection(s.id, { label: e.target.value })} placeholder="Box title, such as Director's note" />
                                        <textarea className={`${field} leading-relaxed`} rows={5} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })} placeholder="Their words" />
                                    </>
                                )}
                                {s.type === 'image' && (
                                    <>
                                        <div className="flex flex-wrap items-center gap-4">
                                            {s.content && <img src={zineImg(s.content, 300)} alt="" className="w-28 h-20 object-cover rounded-lg border border-white/10" />}
                                            <S3Uploader label={s.content ? 'Replace picture' : 'Upload picture'} onUploadSuccess={url => patchSection(s.id, { content: url })} />
                                        </div>
                                        <input className={`${field} text-xs`} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })} placeholder="…or paste a picture address" />
                                    </>
                                )}
                                {s.type === 'gallery' && (
                                    <>
                                        <S3Uploader label="Add a picture to this set" onUploadSuccess={url => patchSection(s.id, { content: s.content.trim() ? `${s.content.trim()}\n${url}` : url })} />
                                        <textarea className={`${field} text-xs`} rows={4} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })} placeholder="One picture address per line" />
                                    </>
                                )}
                                {(s.type === 'image' || s.type === 'gallery') && (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        <input className={field} value={s.caption || ''} onChange={e => patchSection(s.id, { caption: e.target.value })} placeholder="Caption: who or what is this?" />
                                        <input className={field} value={s.credit || ''} onChange={e => patchSection(s.id, { credit: e.target.value })} placeholder="Photo credit" />
                                    </div>
                                )}
                                {s.type === 'video' && <input className={field} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })} placeholder="Video address (an .mp4 link)" />}
                                {s.type === 'film' && (
                                    <select className={field} value={s.content} onChange={e => patchSection(s.id, { content: e.target.value })}>
                                        <option value="">Choose a film…</option>
                                        {movieList.map(m => <option key={m.key} value={m.key}>{m.title}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                        <div className={`${panel} !p-4`}>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Add to the story</p>
                            <div className="flex flex-wrap gap-2">
                                {BLOCK_BUTTONS.map(b => <button key={b.type} onClick={() => addBlock(b.type)} className="px-4 py-2 rounded-full text-xs font-bold bg-white/5 hover:bg-white hover:text-black border border-white/10 text-gray-200 transition-colors">+ {b.label}</button>)}
                            </div>
                        </div>
                    </section>

                    <section className={`${panel} space-y-3`}>
                        <h3 className="text-lg font-black text-white" style={{ fontFamily: SERIF }}>Ready to publish?</h3>
                        {check.errors.length === 0 && <p className="text-sm text-emerald-400">✓ Nothing is missing.</p>}
                        {check.errors.map(e => <p key={e} className="text-sm text-red-300">✕ {e}</p>)}
                        {check.tips.map(t => <p key={t} className="text-sm text-amber-200">• {t}</p>)}
                    </section>

                    {form.id && (
                        <div className="text-right"><button disabled={busy} className="text-xs text-gray-600 hover:text-red-400" onClick={remove}>Delete this story</button></div>
                    )}
                </div>

                {/* Live preview */}
                <div className="xl:sticky xl:top-24">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Preview: how readers will see it</p>
                    <div className="bg-[#faf6ef] text-zinc-900 rounded-3xl overflow-hidden border-8 border-black max-h-[80vh] overflow-y-auto">
                        <div className="px-6 md:px-10 py-10">
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-red-600 mb-4">{typeLabel(form.type)}</p>
                            <h1 style={{ fontFamily: SERIF }} className="text-4xl md:text-5xl font-black leading-[1.05]">{form.title || 'Your headline'}</h1>
                            {form.subtitle && <p style={{ fontFamily: SERIF }} className="mt-4 text-xl italic text-zinc-600 leading-snug">{form.subtitle}</p>}
                            <p className="mt-5 pt-4 border-t border-zinc-300 text-sm text-zinc-500">By <span className="font-bold text-zinc-900">{form.author || 'Your name'}</span> · {readingMinutes(form)} min read</p>
                        </div>
                        {form.heroImage && <img src={zineImg(form.heroImage, 1200)} alt="" className="w-full h-auto" />}
                        <div className="px-6 md:px-10 py-10">
                            <ZineArticleBody sections={sections.filter(s => s.content.trim() || s.type === 'film')} movies={allMovies} preview />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorialManager;
