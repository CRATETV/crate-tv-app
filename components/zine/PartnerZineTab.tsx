import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { callPartnerPortal, uploadPartnerFile } from '../../services/partnerApi';
import { PartnerPiece, PIECE_LIMITS, sanitizePartnerPiece } from '../../api/_lib/zineRules';

// "Write for The Unpack": where a partner festival writes a piece for Crate TV's
// magazine. Nothing is published until Crate TV has read it and says yes.

const label = 'block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5';
const input = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40';
const card = 'bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-6';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-red-600 hover:bg-red-500 text-white`;
const btnGhost = `${btn} bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200`;

interface SavedPiece { id: string; piece: PartnerPiece; status: 'draft' | 'submitted' | 'changes' | 'accepted'; note?: string; updatedAt?: string; }

const empty = (byline = ''): PartnerPiece => ({ title: '', deck: '', body: '', pullQuote: '', byline, role: '', photos: [] });

const STATUS: Record<SavedPiece['status'], { text: string; cls: string }> = {
    draft: { text: 'Draft', cls: 'bg-white/10 text-gray-300' },
    submitted: { text: 'With Crate TV', cls: 'bg-amber-500/20 text-amber-300' },
    changes: { text: 'Changes requested', cls: 'bg-red-500/20 text-red-300' },
    accepted: { text: 'Accepted', cls: 'bg-emerald-500/20 text-emerald-300' },
};

const OUTLINE = `## Why we started\n\n\n\n## Three films to see\n\n\n\n## How to join us\n\n`;

const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

const PartnerZineTab: React.FC<{ partnerId: string; partnerName: string }> = ({ partnerId, partnerName }) => {
    const { getUserIdToken } = useAuth();
    const [pieces, setPieces] = useState<SavedPiece[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | 'new' | null>(null);
    const [piece, setPiece] = useState<PartnerPiece>(empty());
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState<number | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await callPartnerPortal<{ pieces: SavedPiece[] }>(getUserIdToken, 'zineList', { partnerId });
            setPieces(res.pieces);
        } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setLoading(false); }
    }, [getUserIdToken, partnerId]);
    useEffect(() => { load(); }, [load]);

    const check = useMemo(() => sanitizePartnerPiece(piece), [piece]);
    const words = wordCount(piece.body);
    const set = (patch: Partial<PartnerPiece>) => { setPiece({ ...piece, ...patch }); setMsg(null); };
    const locked = editingId && editingId !== 'new' && ['submitted', 'accepted'].includes(pieces.find(p => p.id === editingId)?.status || '');

    const open = (p?: SavedPiece) => { setEditingId(p ? p.id : 'new'); setPiece(p ? p.piece : empty()); setMsg(null); };

    const save = async (): Promise<string | null> => {
        setBusy(true);
        try {
            const res = await callPartnerPortal<{ id: string }>(getUserIdToken, 'zineSave', { partnerId, pieceId: editingId === 'new' ? undefined : editingId, piece });
            setEditingId(res.id);
            await load();
            return res.id;
        } catch (e) { setMsg({ ok: false, text: (e as Error).message }); return null; }
        finally { setBusy(false); }
    };

    const saveDraft = async () => { if (await save()) setMsg({ ok: true, text: 'Saved. You can come back and finish it any time.' }); };

    const submit = async () => {
        const id = await save();
        if (!id) return;
        setBusy(true);
        try {
            await callPartnerPortal(getUserIdToken, 'zineSubmit', { partnerId, pieceId: id });
            setMsg({ ok: true, text: 'Sent to Crate TV. We will read it and email you.' });
            setEditingId(null);
            await load();
        } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setBusy(false); }
    };

    const remove = async (id: string) => {
        if (!window.confirm('Delete this piece?')) return;
        try { await callPartnerPortal(getUserIdToken, 'zineDelete', { partnerId, pieceId: id }); setEditingId(null); await load(); }
        catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    };

    const addPhoto = async (file?: File) => {
        if (!file) return;
        if (piece.photos.length >= PIECE_LIMITS.maxPhotos) { setMsg({ ok: false, text: `Up to ${PIECE_LIMITS.maxPhotos} pictures.` }); return; }
        setUploading(0);
        try {
            const url = await uploadPartnerFile(getUserIdToken, partnerId, 'story', file, setUploading);
            set({ photos: [...piece.photos, { url, caption: '', credit: '' }] });
        } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
        finally { setUploading(null); if (fileRef.current) fileRef.current.value = ''; }
    };
    const setPhoto = (i: number, patch: Partial<PartnerPiece['photos'][number]>) => set({ photos: piece.photos.map((p, j) => j === i ? { ...p, ...patch } : p) });
    const movePhoto = (i: number, dir: -1 | 1) => {
        const j = i + dir; if (j < 0 || j >= piece.photos.length) return;
        const next = [...piece.photos]; [next[i], next[j]] = [next[j], next[i]]; set({ photos: next });
    };

    if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

    if (editingId) return (
        <div className="space-y-6">
            <button type="button" className="text-xs font-bold text-gray-400 hover:text-white" onClick={() => { setEditingId(null); setMsg(null); }}>← Back to your pieces</button>
            {locked && <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">This piece is with Crate TV, so it can not be changed right now.</p>}

            <div className={`${card} space-y-5`}>
                <div>
                    <label className={label}>Headline</label>
                    <input className={input} disabled={!!locked} value={piece.title} maxLength={PIECE_LIMITS.title} onChange={e => set({ title: e.target.value })} placeholder="Short and specific, like “Why we show films in a barbershop”" />
                </div>
                <div>
                    <label className={label}>One-line summary</label>
                    <input className={input} disabled={!!locked} value={piece.deck} maxLength={PIECE_LIMITS.deck} onChange={e => set({ deck: e.target.value })} placeholder="One sentence that makes people want to read on" />
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                    <div>
                        <label className={label}>Your name (the writer)</label>
                        <input className={input} disabled={!!locked} value={piece.byline} onChange={e => set({ byline: e.target.value })} placeholder="Ann Lee" />
                    </div>
                    <div>
                        <label className={label}>Your role at {partnerName}</label>
                        <input className={input} disabled={!!locked} value={piece.role} onChange={e => set({ role: e.target.value })} placeholder="Festival director" />
                    </div>
                </div>
            </div>

            <div className={`${card} space-y-3`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className={`${label} mb-0`}>Your story</label>
                    {!piece.body.trim() && !locked && <button type="button" className={btnGhost} onClick={() => set({ body: OUTLINE })}>Start with an outline</button>}
                </div>
                <textarea className={`${input} min-h-[360px] leading-relaxed`} disabled={!!locked} value={piece.body} onChange={e => set({ body: e.target.value })}
                    placeholder={'Write here. Leave a blank line between paragraphs.\nTo make a heading, start a line with ## and a space.'} />
                <p className={`text-xs ${words < PIECE_LIMITS.minWords || words > PIECE_LIMITS.maxWords ? 'text-amber-300' : 'text-emerald-400'}`}>{words} words · aim for 400 to 800 (minimum {PIECE_LIMITS.minWords})</p>
            </div>

            <div className={`${card} space-y-3`}>
                <label className={label}>A line people will remember (optional)</label>
                <input className={input} disabled={!!locked} value={piece.pullQuote} maxLength={240} onChange={e => set({ pullQuote: e.target.value })} placeholder="A sentence from your story, or something a filmmaker or audience member said" />
            </div>

            <div className={`${card} space-y-4`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <label className={`${label} mb-0`}>Pictures ({piece.photos.length}/{PIECE_LIMITS.maxPhotos})</label>
                        <p className="text-xs text-gray-500 mt-1">The first picture becomes the cover. Use wide, bright photos of people, not just posters.</p>
                    </div>
                    {!locked && <>
                        <button type="button" className={btnGhost} disabled={uploading !== null || piece.photos.length >= PIECE_LIMITS.maxPhotos} onClick={() => fileRef.current?.click()}>{uploading !== null ? `Uploading ${uploading}%` : '+ Add a picture'}</button>
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => addPhoto(e.target.files?.[0])} />
                    </>}
                </div>
                {piece.photos.map((p, i) => (
                    <div key={p.url} className="flex gap-4 items-start bg-black/30 border border-white/10 rounded-xl p-3">
                        <img src={p.url} alt="" className="w-24 h-20 object-cover rounded-lg flex-shrink-0" />
                        <div className="flex-grow space-y-2 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{i === 0 ? 'Cover picture' : `Picture ${i + 1}`}</p>
                            <input className={input} disabled={!!locked} value={p.caption} maxLength={200} onChange={e => setPhoto(i, { caption: e.target.value })} placeholder="Caption: who or what is in this picture?" />
                            <input className={input} disabled={!!locked} value={p.credit} maxLength={80} onChange={e => setPhoto(i, { credit: e.target.value })} placeholder="Photo credit (who took it)" />
                        </div>
                        {!locked && (
                            <div className="flex flex-col gap-1 text-xs">
                                <button type="button" className="text-gray-400 hover:text-white" onClick={() => movePhoto(i, -1)}>↑</button>
                                <button type="button" className="text-gray-400 hover:text-white" onClick={() => movePhoto(i, 1)}>↓</button>
                                <button type="button" className="text-gray-500 hover:text-red-400" onClick={() => set({ photos: piece.photos.filter((_, j) => j !== i) })}>✕</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!locked && (
                <div className={card}>
                    <p className={label}>Before you send it</p>
                    {check.errors.length === 0 ? <p className="text-sm text-emerald-400">✓ Everything is filled in.</p> : (
                        <ul className="space-y-1">{check.errors.map(e => <li key={e} className="text-sm text-amber-300">• {e}</li>)}</ul>
                    )}
                </div>
            )}

            {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
            {!locked && (
                <div className="flex gap-3 flex-wrap">
                    <button type="button" className={btnGhost} disabled={busy} onClick={saveDraft}>{busy ? 'Saving…' : 'Save draft'}</button>
                    <button type="button" className={btnPrimary} disabled={busy || check.errors.length > 0} onClick={submit}>Send to Crate TV</button>
                    {editingId !== 'new' && <button type="button" className="text-xs text-gray-500 hover:text-red-400 ml-auto" onClick={() => remove(editingId)}>Delete piece</button>}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className={`${card} space-y-4`}>
                <div>
                    <p className="text-lg font-black text-white">Write for The Unpack</p>
                    <p className="text-sm text-gray-300 mt-1">The Unpack is Crate TV's magazine. We would love a piece from {partnerName}: your story, your lineup and the people behind it, in your own words. Crate TV reads it, does a light edit, and publishes it with your name.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-5 text-sm">
                    <div>
                        <p className={label}>What to write</p>
                        <ul className="space-y-1.5 text-gray-300 list-disc pl-5">
                            <li><strong className="text-white">Why we started.</strong> Why does this festival exist and who is it for?</li>
                            <li><strong className="text-white">Three films to see.</strong> A short paragraph about each and why you chose it.</li>
                            <li><strong className="text-white">How to join us.</strong> Dates, how to watch, how to get a pass.</li>
                        </ul>
                    </div>
                    <div>
                        <p className={label}>House rules</p>
                        <ul className="space-y-1.5 text-gray-300 list-disc pl-5">
                            <li>400 to 800 words. Short paragraphs. Write like you talk.</li>
                            <li>2 to 6 pictures with captions and credits. Only use pictures you have permission to share.</li>
                            <li>Be specific: names, places, a moment. Avoid "amazing" and "must-see".</li>
                            <li>Get permission before quoting someone or naming a person in a photo.</li>
                            <li>No ads or discount codes. Tell the story and the tickets will follow.</li>
                        </ul>
                    </div>
                </div>
                <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={() => open()}>Write a piece</button></div>
            </div>

            {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}

            {pieces.length > 0 && (
                <div className={`${card} space-y-3`}>
                    <p className={label}>Your pieces</p>
                    {pieces.map(p => (
                        <button key={p.id} type="button" onClick={() => open(p)} className="w-full text-left bg-black/30 hover:bg-black/50 border border-white/10 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-white truncate">{p.piece.title || 'Untitled'}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS[p.status].cls}`}>{STATUS[p.status].text}</span>
                            </div>
                            {p.status === 'changes' && p.note && <p className="mt-2 text-sm text-red-200 bg-red-500/10 rounded-lg px-3 py-2 whitespace-pre-wrap">{p.note}</p>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PartnerZineTab;
