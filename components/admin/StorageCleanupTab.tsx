import React, { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Modal, Notice, PageHeader, StatTile, adminPost, inputClass } from './ui';

// Admin → Storage clean-up (Oct 2026). Lists the video files in the S3
// bucket that CRATE doesn't use (hidden films, old copies, unused
// submission uploads, original files already converted for streaming), and
// lets you mark each one Keep or Delete. Everything starts as Keep.
// The server re-checks before deleting: api/admin-storage-cleanup.ts.

interface Row { id: string; label: string; detail: string; reason: string; size: number; files: number; isFolder: boolean; filmKey?: string; filmTitle?: string; canRemoveFilm?: boolean; keepFilmWhy?: string | null }
interface ScanResult { groups: Row[]; keptVideos: number; filmsInUse: number; filmsNotInUse: number; totalObjects: number }

const GB = 1024 ** 3;
const fmtSize = (b: number) => b >= GB ? `${(b / GB).toFixed(2)} GB` : `${Math.max(1, Math.round(b / 1024 ** 2))} MB`;
const perMonth = (b: number) => `$${((b / GB) * 0.023).toFixed(2)}/mo`;

const StorageCleanupTab: React.FC = () => {
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [typed, setTyped] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [doneMsg, setDoneMsg] = useState('');
    const [removeFilms, setRemoveFilms] = useState(false);

    const runScan = async (keepMessage = false) => {
        setLoading(true); setError(''); if (!keepMessage) setDoneMsg('');
        try {
            const r = await adminPost<ScanResult>('/api/admin-storage-cleanup', { action: 'scan' });
            setScan(r); setMarked(new Set());
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not check storage.'); }
        finally { setLoading(false); }
    };

    const rows = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return (scan?.groups || []).filter(r => !q || r.label.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q));
    }, [scan, filter]);
    const allBytes = (scan?.groups || []).reduce((s, r) => s + r.size, 0);
    const markedRows = (scan?.groups || []).filter(r => marked.has(r.id));
    const markedBytes = markedRows.reduce((s, r) => s + r.size, 0);
    // Hidden films behind the marked rows (one entry per film).
    const markedFilms = [...new Map(markedRows.filter(r => r.filmKey).map(r => [r.filmKey!, r])).values()];
    const filmsToRemove = markedFilms.filter(r => r.canRemoveFilm);
    const filmsToKeep = markedFilms.filter(r => !r.canRemoveFilm);

    const toggle = (id: string, del: boolean) => setMarked(prev => { const n = new Set(prev); if (del) n.add(id); else n.delete(id); return n; });
    const markShown = (del: boolean) => setMarked(prev => { const n = new Set(prev); rows.forEach(r => del ? n.add(r.id) : n.delete(r.id)); return n; });

    const doDelete = async () => {
        setDeleting(true); setError('');
        try {
            const r = await adminPost<{ deleted: number; rows: number; skipped: number; bytes: number; errors: string[]; filmsRemoved?: string[]; filmsKept?: { title: string; why: string }[] }>('/api/admin-storage-cleanup', { action: 'delete', ids: [...marked], removeFilms: removeFilms && filmsToRemove.length > 0 });
            setConfirming(false); setTyped(''); setRemoveFilms(false);
            const removed = r.filmsRemoved || [];
            const kept = r.filmsKept || [];
            setDoneMsg(`Deleted ${r.rows} item${r.rows === 1 ? '' : 's'} (${fmtSize(r.bytes)}).${r.skipped ? ` ${r.skipped} were kept because they're in use again or already gone.` : ''}${r.errors.length ? ` ${r.errors.length} file(s) couldn't be deleted.` : ''}`
                + (removed.length ? ` Removed from CRATE: ${removed.join(', ')}.` : '')
                + (kept.length ? ` Still on CRATE (hidden): ${kept.map(k => `${k.title} (${k.why})`).join(', ')}.` : ''));
            await runScan(true);
        } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); }
        finally { setDeleting(false); }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Storage clean-up" subtitle="Video files in your S3 bucket that CRATE doesn't use. Mark what to delete, keep the rest." accent="sky"
                actions={<Button variant="primary" accent="sky" onClick={() => runScan()} disabled={loading}>{loading ? 'Checking… (can take a minute)' : scan ? 'Check again' : 'Check storage'}</Button>} />

            {error && <Notice tone="error">{error}</Notice>}
            {doneMsg && <Notice tone="success">{doneMsg}</Notice>}

            {!scan && !loading && (
                <Card>
                    <p className="text-sm text-[#A1A1AD] leading-relaxed">
                        Press <strong className="text-white">Check storage</strong> to list the video files nothing on CRATE uses: hidden films, old copies, unused submission uploads, and original files that were converted for streaming.
                        Always kept, and never listed: posters and photos, anything uploaded in the last 2 days, every visible film, hidden films with an upcoming watch party or a "Hide automatically after" date still to come, films premiered in the last week, festival blocks still in their rewatch week, and partner festival films.
                    </p>
                </Card>
            )}

            {scan && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatTile label="Could be deleted" value={fmtSize(allBytes)} hint={`${scan.groups.length} item${scan.groups.length === 1 ? "" : "s"} · ${perMonth(allBytes)}`} accent="orange" />
                        <StatTile label="Marked to delete" value={fmtSize(markedBytes)} hint={`${markedRows.length} item${markedRows.length === 1 ? "" : "s"} · saves ${perMonth(markedBytes)}`} accent="coral" />
                        <StatTile label="Films in use" value={scan.filmsInUse} hint={`${scan.keptVideos} video files kept`} accent="green" />
                        <StatTile label="Hidden / past films" value={scan.filmsNotInUse} accent="gray" />
                    </div>

                    {scan.groups.length === 0 ? (
                        <EmptyState icon="🧹" title="Nothing to clean up" text="Every video file in the bucket is in use." />
                    ) : (
                        <Card padded={false}>
                            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/[0.06]">
                                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by name…" className={`${inputClass} max-w-xs`} />
                                <Button size="sm" variant="ghost" onClick={() => setMarked(prev => { const n = new Set(prev); (scan?.groups || []).filter(r => r.reason.startsWith('not used')).forEach(r => n.add(r.id)); return n; })}>Mark all "not used": delete</Button>
                                <Button size="sm" variant="ghost" onClick={() => markShown(true)}>Mark shown: delete</Button>
                                <Button size="sm" variant="ghost" onClick={() => markShown(false)}>Mark shown: keep</Button>
                                <div className="flex-1" />
                                <Button variant="primary" accent="coral" disabled={markedRows.length === 0} onClick={() => setConfirming(true)}>
                                    Delete {markedRows.length || ''} marked {markedRows.length ? `(${fmtSize(markedBytes)})` : ''}
                                </Button>
                            </div>
                            <div className="divide-y divide-white/[0.06]">
                                {rows.map(r => {
                                    const del = marked.has(r.id);
                                    return (
                                        <div key={r.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${del ? 'bg-red-500/[0.06]' : ''}`}>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-semibold truncate">{r.label}</p>
                                                <p className="text-xs text-[#8A8A96] truncate" title={r.detail}>{r.reason} · {r.detail}</p>
                                            </div>
                                            <span className="text-sm font-bold text-white tabular-nums w-24 text-right">{fmtSize(r.size)}</span>
                                            <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs font-black uppercase tracking-wider">
                                                <button onClick={() => toggle(r.id, false)} className={`px-3.5 py-2 ${!del ? 'bg-green-600 text-white' : 'text-[#8A8A96] hover:text-white'}`}>Keep</button>
                                                <button onClick={() => toggle(r.id, true)} className={`px-3.5 py-2 ${del ? 'bg-red-600 text-white' : 'text-[#8A8A96] hover:text-white'}`}>Delete</button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {rows.length === 0 && <p className="p-4 text-sm text-[#8A8A96]">Nothing matches that search.</p>}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {confirming && (
                <Modal title="Delete for good?" onClose={() => { if (!deleting) { setConfirming(false); setTyped(''); setRemoveFilms(false); } }}>
                    <div className="space-y-4">
                        <p className="text-sm text-[#A1A1AD]">This permanently deletes <strong className="text-white">{markedRows.length} item{markedRows.length === 1 ? '' : 's'} ({fmtSize(markedBytes)})</strong> from your S3 bucket. It can't be undone. Anything that's in use again by the time you press Delete is kept automatically.</p>
                        <ul className="max-h-40 overflow-y-auto text-xs text-[#8A8A96] space-y-1">
                            {markedRows.slice(0, 50).map(r => <li key={r.id} className="truncate">• {r.label} ({fmtSize(r.size)})</li>)}
                            {markedRows.length > 50 && <li>…and {markedRows.length - 50} more</li>}
                        </ul>
                        {markedFilms.length > 0 && (
                            <div className="rounded-xl border border-white/10 p-3 space-y-2">
                                <label className={`flex items-start gap-2 text-sm ${filmsToRemove.length ? 'text-white cursor-pointer' : 'text-[#5A5A66]'}`}>
                                    <input type="checkbox" className="mt-1" disabled={filmsToRemove.length === 0} checked={removeFilms && filmsToRemove.length > 0} onChange={e => setRemoveFilms(e.target.checked)} />
                                    <span>Also remove {filmsToRemove.length === 1 ? 'this hidden film' : 'these hidden films'} from CRATE (can't be undone)</span>
                                </label>
                                {filmsToRemove.length > 0 && <p className="text-xs text-[#A1A1AD]">Removes: {filmsToRemove.map(r => r.filmTitle).join(', ')}</p>}
                                {filmsToKeep.length > 0 && (
                                    <p className="text-xs text-[#8A8A96]">Stays on CRATE, hidden, even though its video is deleted: {filmsToKeep.map(r => `${r.filmTitle} (${r.keepFilmWhy})`).join(', ')}</p>
                                )}
                            </div>
                        )}
                        <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type DELETE" className={inputClass} autoFocus />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" disabled={deleting} onClick={() => { setConfirming(false); setTyped(''); setRemoveFilms(false); }}>Cancel</Button>
                            <Button variant="primary" accent="coral" disabled={typed !== 'DELETE' || deleting} onClick={doDelete}>{deleting ? 'Deleting…' : 'Delete for good'}</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default StorageCleanupTab;
