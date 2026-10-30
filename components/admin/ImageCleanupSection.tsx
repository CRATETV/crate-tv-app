import React, { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Modal, Notice, PageHeader, StatTile, adminPost, inputClass } from './ui';

// Admin → Storage clean-up → Posters & photos (Oct 2026). Lists picture files
// nothing on CRATE points at, with a small preview, and lets you mark each one
// Keep or Delete. Everything starts as Keep. The server works the list out
// again before deleting: api/admin-storage-cleanup.ts (scanImages/deleteImages).

interface Img { id: string; key: string; size: number; reason: string; lastModified?: string; url: string }
interface ScanResult { images: Img[]; keptImages: number; totalImages: number }

const fmtSize = (b: number) => b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const thumb = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}&w=240`;
const fmtDate = (s?: string) => { const t = s ? Date.parse(s) : NaN; return Number.isFinite(t) ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };

const ImageCleanupSection: React.FC = () => {
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [doneMsg, setDoneMsg] = useState('');
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [typed, setTyped] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [big, setBig] = useState<Img | null>(null);

    const runScan = async (keepMessage = false) => {
        setLoading(true); setError(''); if (!keepMessage) setDoneMsg('');
        try {
            const r = await adminPost<ScanResult>('/api/admin-storage-cleanup', { action: 'scanImages' });
            setScan(r); setMarked(new Set());
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not check pictures.'); }
        finally { setLoading(false); }
    };

    const rows = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return (scan?.images || []).filter(r => !q || r.key.toLowerCase().includes(q));
    }, [scan, filter]);
    const allBytes = (scan?.images || []).reduce((s, r) => s + r.size, 0);
    const markedRows = (scan?.images || []).filter(r => marked.has(r.id));
    const markedBytes = markedRows.reduce((s, r) => s + r.size, 0);
    const toggle = (id: string, del: boolean) => setMarked(prev => { const n = new Set(prev); if (del) n.add(id); else n.delete(id); return n; });
    const markShown = (del: boolean) => setMarked(prev => { const n = new Set(prev); rows.forEach(r => del ? n.add(r.id) : n.delete(r.id)); return n; });

    const doDelete = async () => {
        setDeleting(true); setError('');
        try {
            const r = await adminPost<{ deleted: number; skipped: number; bytes: number; errors: string[] }>('/api/admin-storage-cleanup', { action: 'deleteImages', ids: [...marked] });
            setConfirming(false); setTyped('');
            setDoneMsg(`Deleted ${r.deleted} picture${r.deleted === 1 ? '' : 's'} (${fmtSize(r.bytes)}).${r.skipped ? ` ${r.skipped} were kept because they're in use again or already gone.` : ''}${r.errors.length ? ` ${r.errors.length} couldn't be deleted.` : ''}`);
            await runScan(true);
        } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); }
        finally { setDeleting(false); }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Posters & photos" subtitle="Pictures in your storage that nothing on CRATE uses. Look at each one, mark what to delete, keep the rest." accent="sky"
                actions={<Button variant="primary" accent="sky" onClick={() => runScan()} disabled={loading}>{loading ? 'Checking… (can take a minute)' : scan ? 'Check again' : 'Check pictures'}</Button>} />

            {error && <Notice tone="error">{error}</Notice>}
            {doneMsg && <Notice tone="success">{doneMsg}</Notice>}

            {!scan && !loading && (
                <Card>
                    <p className="text-sm text-[#A1A1AD] leading-relaxed">
                        Press <strong className="text-white">Check pictures</strong> to see poster and photo files that no film, actor, festival, story or page points at any more (old poster versions, pictures from films you removed).
                        Never listed: any picture something still uses (including hidden films), anything uploaded in the last 14 days, and files in folders other tools manage (film submissions, partner uploads, originals, backups).
                        If CRATE can't read every place pictures are saved, it lists nothing.
                    </p>
                </Card>
            )}

            {scan && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatTile label="Could be deleted" value={fmtSize(allBytes)} hint={`${scan.images.length} picture${scan.images.length === 1 ? '' : 's'}`} accent="orange" />
                        <StatTile label="Marked to delete" value={fmtSize(markedBytes)} hint={`${markedRows.length} picture${markedRows.length === 1 ? '' : 's'}`} accent="coral" />
                        <StatTile label="Pictures kept" value={scan.keptImages} hint="in use, recent, or managed elsewhere" accent="green" />
                        <StatTile label="Pictures in storage" value={scan.totalImages} hint="all together" accent="gray" />
                    </div>

                    {scan.images.length === 0 ? (
                        <EmptyState icon="🖼️" title="Nothing to clean up" text="Every picture in storage is in use or was uploaded recently." />
                    ) : (
                        <Card padded={false}>
                            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/[0.06]">
                                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search by file name…" className={`${inputClass} max-w-xs`} />
                                <Button size="sm" variant="ghost" onClick={() => markShown(true)}>Mark shown: delete</Button>
                                <Button size="sm" variant="ghost" onClick={() => markShown(false)}>Mark shown: keep</Button>
                                <div className="flex-1" />
                                <Button variant="primary" accent="coral" disabled={markedRows.length === 0} onClick={() => setConfirming(true)}>
                                    Delete {markedRows.length || ''} marked {markedRows.length ? `(${fmtSize(markedBytes)})` : ''}
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                                {rows.map(r => {
                                    const del = marked.has(r.id);
                                    return (
                                        <div key={r.id} className={`rounded-xl border overflow-hidden ${del ? 'border-red-500/50 bg-red-500/[0.06]' : 'border-white/10'}`}>
                                            <button type="button" onClick={() => setBig(r)} className="block w-full bg-black/40" aria-label={`Preview ${r.key}`}>
                                                <img src={thumb(r.url)} alt="" loading="lazy" className="w-full h-44 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).src = r.url; }} />
                                            </button>
                                            <div className="p-3 space-y-2">
                                                <p className="text-sm text-white font-semibold truncate" title={r.key}>{r.key.split('/').pop()}</p>
                                                <p className="text-xs text-[#8A8A96] truncate" title={r.key}>{r.key.includes('/') ? r.key.slice(0, r.key.lastIndexOf('/') + 1) + ' · ' : ''}{fmtSize(r.size)}{fmtDate(r.lastModified) ? ` · ${fmtDate(r.lastModified)}` : ''}</p>
                                                <div className="flex rounded-xl overflow-hidden border border-white/10 text-xs font-black uppercase tracking-wider">
                                                    <button onClick={() => toggle(r.id, false)} className={`flex-1 py-2 ${!del ? 'bg-green-600 text-white' : 'text-[#8A8A96] hover:text-white'}`}>Keep</button>
                                                    <button onClick={() => toggle(r.id, true)} className={`flex-1 py-2 ${del ? 'bg-red-600 text-white' : 'text-[#8A8A96] hover:text-white'}`}>Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {rows.length === 0 && <p className="p-4 text-sm text-[#8A8A96]">Nothing matches that search.</p>}
                        </Card>
                    )}
                </>
            )}

            {big && (
                <Modal title={big.key.split('/').pop() || 'Picture'} onClose={() => setBig(null)}>
                    <img src={thumb(big.url).replace('w=240', 'w=1000')} alt="" className="w-full max-h-[70vh] object-contain rounded-lg bg-black/40" onError={e => { (e.currentTarget as HTMLImageElement).src = big.url; }} />
                    <p className="text-xs text-[#8A8A96] mt-2 break-all">{big.key} · {fmtSize(big.size)}</p>
                </Modal>
            )}

            {confirming && (
                <Modal title="Delete for good?" onClose={() => { if (!deleting) { setConfirming(false); setTyped(''); } }}>
                    <div className="space-y-4">
                        <p className="text-sm text-[#A1A1AD]">This permanently deletes <strong className="text-white">{markedRows.length} picture{markedRows.length === 1 ? '' : 's'} ({fmtSize(markedBytes)})</strong> from your storage. It can't be undone. Anything that's in use again by the time you press Delete is kept automatically.</p>
                        <ul className="max-h-40 overflow-y-auto text-xs text-[#8A8A96] space-y-1">
                            {markedRows.slice(0, 50).map(r => <li key={r.id} className="truncate">• {r.key} ({fmtSize(r.size)})</li>)}
                            {markedRows.length > 50 && <li>…and {markedRows.length - 50} more</li>}
                        </ul>
                        <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type DELETE" className={inputClass} autoFocus />
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" disabled={deleting} onClick={() => { setConfirming(false); setTyped(''); }}>Cancel</Button>
                            <Button variant="primary" accent="coral" disabled={typed !== 'DELETE' || deleting} onClick={doDelete}>{deleting ? 'Deleting…' : 'Delete for good'}</Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ImageCleanupSection;
