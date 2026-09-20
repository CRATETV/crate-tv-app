import React, { useEffect, useMemo, useState } from 'react';
import { MoviePipelineEntry } from '../types';
import { deleteMoviePipelineEntry } from '../services/firebaseService';

// Helper to get admin password from session (same as rest of admin panel)
const getAdminPassword = () => sessionStorage.getItem('adminPassword') || '';

/**
 * The admin API returns Firestore timestamps as JSON — {_seconds, _nanoseconds} —
 * not Timestamp objects, so `.toDate()` doesn't exist on them.
 */
export const tsToDate = (ts: any): Date | null => {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    const seconds = ts.seconds ?? ts._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
    if (typeof ts === 'string' || typeof ts === 'number') {
        const d = new Date(ts);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

const entryDate = (item: MoviePipelineEntry): Date | null =>
    tsToDate(item.submittedAt) || tsToDate(item.submissionDate) || tsToDate(item.createdAt);

/** A filmmaker-portal submission that no admin has opened yet. */
export const isNewSubmission = (item: MoviePipelineEntry): boolean =>
    item.source === 'filmmaker-portal' && item.status === 'submitted' && !item.viewedAt;

/**
 * Submissions are untrusted input. Only http(s) links may become a clickable
 * href / media src — this blocks `javascript:` and `data:` URLs planted in a
 * submission from running in the admin panel (which holds the admin session).
 */
export const safeUrl = (value?: string): string | null => {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
        return null;
    }
};

/**
 * Files stay locked (no poster preview, no player, no download links, no approving)
 * unless the virus scan is off or has cleared them. Mirrors publishBlockReason on the server.
 */
export const isFileAccessBlocked = (item: MoviePipelineEntry): boolean =>
    ['pending', 'infected', 'error'].includes(item.security?.scan || '');

const formatBytes = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const SCAN_UI: Record<string, { label: string; className: string; detail: string }> = {
    clean: { label: '🛡 Scan clean', className: 'bg-green-500/15 text-green-400', detail: 'Virus scan passed.' },
    pending: { label: '⏳ Scanning', className: 'bg-yellow-500/15 text-yellow-400', detail: 'Virus scan in progress — files are locked until it finishes.' },
    infected: { label: '☣ Malware', className: 'bg-red-600 text-white', detail: 'Flagged by the virus scan. Files are locked — reject this submission.' },
    error: { label: '⚠ Scan failed', className: 'bg-red-500/20 text-red-400', detail: 'The virus scan could not complete. Files are locked.' },
    not_configured: { label: 'Not scanned', className: 'bg-gray-500/20 text-gray-400', detail: 'No virus scanner is set up for this submission — open files with care.' },
};
const scanUi = (item: MoviePipelineEntry) => SCAN_UI[item.security?.scan || 'not_configured'] || SCAN_UI.not_configured;

// Spreadsheet apps run cells starting with = + - @ as formulas — a submitted
// title like =HYPERLINK(...) would execute when the export is opened.
const csvCell = (value: unknown): string => {
    let text = String(value ?? '');
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
};

const sourceLabel = (source?: string) =>
    source === 'filmmaker-portal' ? 'Filmmaker Portal'
    : source === 'WEB_FORM_V4_SECURE' ? 'Manual entry'
    : source || 'Unknown';

type Filter = 'all' | 'new' | 'submitted' | 'consideration' | 'approved' | 'catalog';

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'new', label: 'New' },
    { id: 'submitted', label: 'Awaiting Review' },
    { id: 'consideration', label: 'On Hold' },
    { id: 'approved', label: 'Premium' },
    { id: 'catalog', label: 'Catalog' },
];

const matchesFilter = (item: MoviePipelineEntry, filter: Filter): boolean => {
    switch (filter) {
        case 'all': return true;
        case 'new': return isNewSubmission(item);
        case 'submitted': return !item.status || item.status === 'submitted' || item.status === 'pending';
        default: return item.status === filter;
    }
};

interface MoviePipelineTabProps {
    pipeline: MoviePipelineEntry[];
    onCreateMovie: (item: MoviePipelineEntry) => void;
    onRefresh: () => void;
    /** Called when an admin opens a NEW submission, so it stops showing as new. */
    onViewed: (id: string) => void;
    onMarkAllViewed: () => void;
}

const emptyEntry = {
    title: '',
    director: '',
    cast: '',
    synopsis: '',
    posterUrl: '',
    movieUrl: '',
    submitterEmail: ''
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => (
    <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
        status === 'submitted' ? 'bg-blue-500/20 text-blue-400' :
        status === 'approved' ? 'bg-green-500/20 text-green-400' :
        status === 'catalog' ? 'bg-emerald-500/20 text-emerald-400' :
        status === 'consideration' ? 'bg-indigo-500/20 text-indigo-300' :
        status === 'rejected' ? 'bg-red-500/20 text-red-400' :
        'bg-gray-500/20 text-gray-400'
    }`}>
        {status || 'pending'}
    </span>
);

const SecurityBadge: React.FC<{ item: MoviePipelineEntry }> = ({ item }) => {
    // Older entries predate the checks entirely — no badge rather than a misleading one.
    if (!item.security) return null;
    const ui = scanUi(item);
    return <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${ui.className}`} title={ui.detail}>{ui.label}</span>;
};

const NewBadge: React.FC = () => (
    <span className="bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse">
        ● New
    </span>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">{label}</p>
        <div className="text-sm text-gray-200 break-words">{children}</div>
    </div>
);

/** A link if the value is a safe http(s) URL, otherwise inert text. */
const SafeLink: React.FC<{ value?: string; className?: string }> = ({ value, className }) => {
    const href = safeUrl(value);
    if (!href) return <span>{value}</span>;
    return <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={className || 'text-blue-400 hover:underline'}>{value}</a>;
};

export const MoviePipelineTab: React.FC<MoviePipelineTabProps> = ({ pipeline, onCreateMovie, onRefresh, onViewed, onMarkAllViewed }) => {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [newEntry, setNewEntry] = useState(emptyEntry);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Derived from the live list so the open panel updates after approve/hold/refresh.
    const selected = selectedId ? pipeline.find(p => p.id === selectedId) || null : null;
    const selectedItemId = selected?.id;

    const newCount = useMemo(() => pipeline.filter(isNewSubmission).length, [pipeline]);
    const filterCounts = useMemo(() => {
        const counts = {} as Record<Filter, number>;
        FILTERS.forEach(f => { counts[f.id] = pipeline.filter(item => matchesFilter(item, f.id)).length; });
        return counts;
    }, [pipeline]);
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return pipeline.filter(item => matchesFilter(item, filter) && (!q ||
            [item.title, item.director, item.email, item.submitterEmail, item.submitterName]
                .some(field => (field || '').toLowerCase().includes(q))));
    }, [pipeline, filter, search]);

    // Close the panel with Escape and stop the page behind it from scrolling.
    useEffect(() => {
        if (!selectedItemId) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null); };
        window.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [selectedItemId]);

    const openSubmission = (item: MoviePipelineEntry) => {
        setSelectedId(item.id);
        if (isNewSubmission(item)) onViewed(item.id);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this submission? This cannot be undone.")) return;
        setProcessingId(id);
        try {
            await deleteMoviePipelineEntry(id);
            if (selectedId === id) setSelectedId(null);
            onRefresh();
        } catch (error) {
            alert(`Failed to delete submission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleApprove = async (item: MoviePipelineEntry) => {
        if (!window.confirm(`Approve "${item.title}" for PREMIUM? An approval email will be sent to ${item.email || 'the filmmaker'}.`)) return;
        setProcessingId(item.id);
        try {
            const res = await fetch('/api/approve-film-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: item.id, password: getAdminPassword() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Approval failed');
            alert(`✅ "${item.title}" approved for Premium!${data.emailSent ? ' Filmmaker has been notified.' : ''}`);
            onRefresh();
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleAddToCatalog = async (item: MoviePipelineEntry) => {
        if (!window.confirm(`Add "${item.title}" to the general catalog? A notification email will be sent to ${item.email || 'the filmmaker'}.`)) return;
        setProcessingId(item.id);
        try {
            const res = await fetch('/api/add-to-catalog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: item.id, password: getAdminPassword() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            alert(`📂 "${item.title}" added to catalog!${data.emailSent ? ' Filmmaker has been notified.' : ''}`);
            onRefresh();
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleHold = async (item: MoviePipelineEntry) => {
        setProcessingId(item.id);
        try {
            const res = await fetch('/api/update-submission-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submissionId: item.id, status: 'consideration', password: getAdminPassword() }),
            });
            if (!res.ok) throw new Error('Failed to update status');
            onRefresh();
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreate = (item: MoviePipelineEntry) => {
        setProcessingId(item.id);
        onCreateMovie(item);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const payload = {
                filmTitle: newEntry.title,
                directorName: newEntry.director,
                email: newEntry.submitterEmail,
                cast: newEntry.cast,
                synopsis: newEntry.synopsis,
                posterUrl: newEntry.posterUrl,
                movieUrl: newEntry.movieUrl,
                password: getAdminPassword()
            };

            const response = await fetch('/api/send-submission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to add to pipeline.");
            }

            alert("Film added to pipeline successfully!");
            setNewEntry(emptyEntry);
            setIsFormVisible(false);
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewEntry(prev => ({ ...prev, [name]: value }));
    };

    const handleExportCSV = () => {
        const headers = ["Title", "Director", "Status", "Cast", "Synopsis", "Poster URL", "Movie URL", "Submitter Email", "Date"];
        const rows = pipeline.map(item => [
            csvCell(item.title),
            csvCell(item.director),
            csvCell(item.status || 'pending'),
            csvCell(item.cast),
            csvCell(item.synopsis),
            csvCell(item.poster || item.posterUrl),
            csvCell(item.fullMovie || item.movieUrl),
            csvCell(item.email || item.submitterEmail),
            csvCell(entryDate(item)?.toISOString() || '---'),
        ]);

        // Blob download (not a data: URL) — a "#" in a title used to truncate the file.
        const csvContent = '﻿' + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const blobUrl = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement("a");
        link.setAttribute("href", blobUrl);
        link.setAttribute("download", `CRATE_PIPELINE_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    };

    const renderActions = (item: MoviePipelineEntry) => {
        const locked = isFileAccessBlocked(item);
        const lockedTitle = `Locked — ${scanUi(item).detail}`;
        return (
        <div className="flex flex-wrap gap-3">
            {item.status !== 'approved' && (
                <button
                    onClick={() => handleApprove(item)}
                    disabled={processingId === item.id || locked}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                    title={locked ? lockedTitle : "Accept for Premium tier — emails filmmaker + $4.99 ticket"}
                >
                    {processingId === item.id ? '...' : '⭐ Approve for Premium'}
                </button>
            )}
            {item.status !== 'catalog' && item.status !== 'approved' && (
                <button
                    onClick={() => handleAddToCatalog(item)}
                    disabled={processingId === item.id || locked}
                    className="bg-green-600/90 hover:bg-green-500 text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                    title={locked ? lockedTitle : "Add to free catalog — emails filmmaker"}
                >
                    {processingId === item.id ? '...' : '📂 Add to Catalog'}
                </button>
            )}
            {item.status !== 'consideration' && item.status !== 'approved' && item.status !== 'catalog' && (
                <button
                    onClick={() => handleHold(item)}
                    disabled={processingId === item.id}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-blue-500/20 transition-all disabled:opacity-50"
                    title="Hold for later consideration — no email sent"
                >
                    {processingId === item.id ? '...' : '🔖 Hold for Consideration'}
                </button>
            )}
            {item.status !== 'approved' && item.status !== 'catalog' && (
                <button
                    onClick={() => handleDelete(item.id)}
                    disabled={processingId === item.id}
                    className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all disabled:opacity-50"
                    title="Reject — removes from pipeline, no email sent"
                >
                    ✕ Reject
                </button>
            )}
            {(item.status === 'approved' || item.status === 'catalog') && (
                <button
                    onClick={() => handleDelete(item.id)}
                    disabled={processingId === item.id}
                    className="bg-white/5 hover:bg-red-600/20 text-gray-600 hover:text-red-400 font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-white/5 hover:border-red-500/20 transition-all disabled:opacity-50"
                    title="Remove from pipeline (film stays in catalog)"
                >
                    🗑 Remove from Pipeline
                </button>
            )}
                </div>
        );
    };

    const renderDetailPanel = (item: MoviePipelineEntry) => {
        const blocked = isFileAccessBlocked(item);
        const posterHref = blocked ? null : safeUrl(item.poster || item.posterUrl);
        const filmHref = blocked ? null : safeUrl(item.fullMovie || item.movieUrl);
        const sec = item.security;
        const submitted = entryDate(item);
        const viewed = tsToDate(item.viewedAt);
        const contact = item.email || item.submitterEmail;
        const episodeLines = (item.episodeLinks || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        return (
            <div
                className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
                onClick={() => setSelectedId(null)}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Submission: ${item.title}`}
                    className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] w-full max-w-4xl my-8 p-6 md:p-10 space-y-8"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {isNewSubmission(item) && <NewBadge />}
                                <StatusBadge status={item.status} />
                                <SecurityBadge item={item} />
                                <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 text-gray-400">
                                    {sourceLabel(item.source)}
                                </span>
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic leading-none break-words">{item.title}</h3>
                            <p className="text-red-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-3 break-words">Directed by {item.director}</p>
                        </div>
                        <button
                            onClick={() => setSelectedId(null)}
                            className="flex-shrink-0 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full w-10 h-10 text-lg transition-all"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-shrink-0">
                            {posterHref ? (
                                <a href={posterHref} target="_blank" rel="noopener noreferrer">
                                    <img src={posterHref} alt={item.title} className="w-48 h-72 object-cover rounded-2xl shadow-2xl border border-white/10" />
                                </a>
                            ) : (
                                <div className="w-48 h-72 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 text-xs text-center px-4">{blocked ? '🔒 Held until scan clears' : 'No Poster'}</div>
                            )}
                        </div>

                        <div className="flex-grow min-w-0 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <DetailRow label="Submitted By">{item.submitterName || item.director}</DetailRow>
                                <DetailRow label="Contact Email">
                                    {contact ? <a href={`mailto:${contact}`} className="text-blue-400 hover:underline">{contact}</a> : '—'}
                                </DetailRow>
                                <DetailRow label="Submitted">
                                    {submitted ? `${submitted.toLocaleDateString()} at ${submitted.toLocaleTimeString()}` : '—'}
                                </DetailRow>
                                <DetailRow label="First Viewed">
                                    {viewed ? `${viewed.toLocaleDateString()} at ${viewed.toLocaleTimeString()}` : 'Not yet'}
                                </DetailRow>
                                <DetailRow label="Format">
                                    {item.contentType ? item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1) : '—'}
                                    {item.contentType === 'series' && item.episodeCount ? ` · ${item.episodeCount} episodes` : ''}
                                </DetailRow>
                                <DetailRow label="Runtime">{item.runtime || '—'}</DetailRow>
                                <DetailRow label="Year">{item.year || '—'}</DetailRow>
                                <DetailRow label="Genre">{item.genre || '—'}</DetailRow>
                                {sec && (
                                    <DetailRow label="File Checks">
                                        <p>{sec.typeCheck === 'passed'
                                            ? `✓ Confirmed real files: ${(sec.filmKind || 'video').toUpperCase()}${sec.filmSize ? ` (${formatBytes(sec.filmSize)})` : ''} + ${(sec.posterKind || 'image').toUpperCase()}`
                                            : 'Could not verify file types'}</p>
                                        <p className="text-gray-400">{scanUi(item).detail}{sec.threat ? ` (${sec.threat})` : ''}</p>
                                    </DetailRow>
                                )}
                                <DetailRow label="Instagram">{item.instagram || '—'}</DetailRow>
                                <DetailRow label="Website">{item.website ? <SafeLink value={item.website} /> : '—'}</DetailRow>
                            </div>

                            {item.cast && <DetailRow label="Cast">{item.cast}</DetailRow>}

                            <DetailRow label="Synopsis">
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{item.synopsis || '—'}</p>
                            </DetailRow>

                            {episodeLines.length > 0 && (
                                <DetailRow label="Episode Links">
                                    <ul className="space-y-1">
                                        {episodeLines.map((line, i) => <li key={i}><SafeLink value={line} /></li>)}
                                    </ul>
                                </DetailRow>
                            )}

                            {item.reviewNotes && <DetailRow label="Review Notes">{item.reviewNotes}</DetailRow>}

                            <p className="text-[9px] text-gray-700 font-mono break-all">Submission ID: {item.key || item.id}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">Film</p>
                        {filmHref ? (
                            <>
                                {/* preload="none": nothing downloads until an admin presses play. */}
                                <video
                                    controls
                                    preload="none"
                                    poster={posterHref || undefined}
                                    src={filmHref}
                                    className="w-full max-h-[420px] rounded-2xl bg-black border border-white/10"
                                />
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={filmHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest border border-cyan-500/20 rounded-lg px-3 py-1.5 hover:bg-cyan-500/10 transition-all"
                                    >
                                        ▶ Open / Download Film
                                    </a>
                                    {posterHref && (
                                        <a
                                            href={posterHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest border border-purple-500/20 rounded-lg px-3 py-1.5 hover:bg-purple-500/10 transition-all"
                                        >
                                            🖼 Open Poster
                                        </a>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className={`text-xs ${blocked ? 'text-yellow-500' : 'text-gray-600'}`}>
                                {blocked ? `🔒 ${scanUi(item).detail}` : 'No film link on this submission.'}
                            </p>
                        )}
                    </div>

                    <div className="border-t border-white/5 pt-6">
                        {renderActions(item)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Submission Pipeline ({pipeline.length})</h2>
                    {newCount > 0 && (
                        <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                            {newCount} new
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-3">
                    {newCount > 0 && (
                        <button
                            onClick={onMarkAllViewed}
                            className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                        >
                            Mark all as seen
                        </button>
                    )}
                    <button
                        onClick={onRefresh}
                        className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                    >
                        ↻ Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="bg-white/5 hover:bg-white text-gray-500 hover:text-black font-black py-2.5 px-6 rounded-xl text-[10px] uppercase tracking-widest border border-white/10 transition-all"
                    >
                        Export Spreadsheet (.csv)
                    </button>
                </div>
            </div>

            <div className="bg-[#0f0f0f] p-8 rounded-[2.5rem] border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Manual Entry Protocol</h3>
                    <button onClick={() => setIsFormVisible(!isFormVisible)} className="text-xs bg-red-600 hover:bg-red-700 text-white font-black py-2 px-6 rounded-xl shadow-xl transition-all">
                        {isFormVisible ? 'Hide Ingestion Interface' : 'Ingest Film into Jury Room'}
                    </button>
                </div>

                {isFormVisible && (
                    <form onSubmit={handleManualSubmit} className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="form-label">Film Title</label>
                                <input type="text" name="title" value={newEntry.title} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                            <div>
                                <label className="form-label">Director's Name</label>
                                <input type="text" name="director" value={newEntry.director} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Main Cast (comma-separated)</label>
                            <input type="text" name="cast" value={newEntry.cast} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                        </div>
                        <div>
                            <label className="form-label">Synopsis</label>
                            <textarea name="synopsis" value={newEntry.synopsis} onChange={handleInputChange} rows={3} className="form-input bg-black/40 border-white/10" required></textarea>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="form-label">Poster URL</label>
                                <input type="text" name="posterUrl" value={newEntry.posterUrl} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                            <div>
                                <label className="form-label">Movie File URL</label>
                                <input type="text" name="movieUrl" value={newEntry.movieUrl} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="form-label">Submitter Email</label>
                                <input type="email" name="submitterEmail" value={newEntry.submitterEmail} onChange={handleInputChange} className="form-input bg-black/40 border-white/10" required />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}

                        <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-xl uppercase text-xs tracking-widest shadow-xl transition-all hover:scale-[1.01] active:scale-95" disabled={isSubmitting}>
                            {isSubmitting ? 'Ingesting Node...' : 'Authorize Manual Ingestion'}
                        </button>
                    </form>
                )}
            </div>

            {/* Filters + search */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                                filter === f.id
                                    ? 'bg-red-600 border-red-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                            }`}
                        >
                            {f.label} <span className="opacity-60">({filterCounts[f.id]})</span>
                        </button>
                    ))}
                </div>
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search title, director, email…"
                    className="form-input bg-black/40 border-white/10 !w-full md:!w-72 text-xs"
                />
            </div>

            {visible.length > 0 ? (
                <div className="space-y-4">
                    {visible.map(item => {
                        const isSubmission = item.source === 'filmmaker-portal';
                        const submittedDate = entryDate(item);
                        const isNew = isNewSubmission(item);
                        const blocked = isFileAccessBlocked(item);
                        const posterHref = blocked ? null : safeUrl(item.poster || item.posterUrl);
                        const filmHref = blocked ? null : safeUrl(item.fullMovie || item.movieUrl);
                        const websiteHref = safeUrl(item.website);

                        return (
                            <div key={item.id} className={`bg-white/[0.02] p-6 rounded-[2.5rem] border transition-colors ${
                                isNew ? 'border-red-500/50 hover:border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.08)]'
                                : isSubmission ? 'border-amber-500/30 hover:border-amber-500/50'
                                : 'border-white/5 hover:border-white/10'
                            }`}>
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    {isNew && <NewBadge />}
                                    {isSubmission && (
                                        <span className="bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                            📤 Filmmaker Submission
                                        </span>
                                    )}
                                    {submittedDate && (
                                        <span className="text-gray-500 text-[9px]">
                                            {submittedDate.toLocaleDateString()} at {submittedDate.toLocaleTimeString()}
                                        </span>
                                    )}
                                    <span className="ml-auto flex items-center gap-2"><SecurityBadge item={item} /><StatusBadge status={item.status} /></span>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8">
                                    {posterHref ? (
                                        <a href={posterHref} target="_blank" rel="noopener noreferrer">
                                            <img src={posterHref} alt={item.title} className="w-32 h-48 object-cover rounded-2xl flex-shrink-0 shadow-2xl border border-white/10 hover:scale-105 transition-transform cursor-pointer" />
                                        </a>
                                    ) : (
                                        <div className="w-32 h-48 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 text-xs text-center px-3 flex-shrink-0">{blocked ? '🔒 Held until scan clears' : 'No Poster'}</div>
                                    )}
                                    <div className="flex-grow min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">{item.title}</h3>
                                                <p className="text-red-500 font-bold uppercase text-[9px] tracking-[0.4em] mt-3">DIRECTOR: {item.director}</p>
                                                {isSubmission && (
                                                    <div className="mt-2 space-y-1">
                                                        {item.email && <p className="text-gray-500 text-[9px]">📧 {item.email}</p>}
                                                        {item.runtime && <p className="text-gray-500 text-[9px]">⏱️ {item.runtime}</p>}
                                                        {item.genre && <p className="text-gray-500 text-[9px]">🎭 {item.genre}</p>}
                                                        {item.year && <p className="text-gray-500 text-[9px]">📅 {item.year}</p>}
                                                        {item.instagram && <p className="text-gray-500 text-[9px]">📷 {item.instagram}</p>}
                                                        {item.website && <p className="text-gray-500 text-[9px]">🌐 {websiteHref
                                                            ? <a href={websiteHref} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-400 hover:underline">{item.website}</a>
                                                            : <span>{item.website}</span>}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-6 line-clamp-2 italic leading-relaxed font-medium">"{item.synopsis}"</p>

                                        {/* View + quick links */}
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <button
                                                onClick={() => openSubmission(item)}
                                                className="bg-white text-black hover:bg-gray-200 font-black py-2 px-5 rounded-lg text-[9px] uppercase tracking-widest transition-all"
                                            >
                                                👁 View Submission
                                            </button>
                                            {filmHref && (
                                                <a
                                                    href={filmHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest border border-cyan-500/20 rounded-lg px-3 py-2 hover:bg-cyan-500/10 transition-all"
                                                >
                                                    ▶ Watch / Download Film
                                                </a>
                                            )}
                                            {posterHref && (
                                                <a
                                                    href={posterHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[9px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-widest border border-purple-500/20 rounded-lg px-3 py-2 hover:bg-purple-500/10 transition-all"
                                                >
                                                    🖼 Download Poster
                                                </a>
                                            )}
                                        </div>

                                        <div className="mt-6">{renderActions(item)}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
                    <p className="text-gray-500 font-black uppercase tracking-[0.4em]">
                        {pipeline.length === 0 ? 'Pipeline Manifest Empty' : 'No submissions match'}
                    </p>
                </div>
            )}

            {selected && renderDetailPanel(selected)}
        </div>
    );
};
