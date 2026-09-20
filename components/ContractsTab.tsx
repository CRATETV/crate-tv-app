import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Contract {
    id: string;
    fileName: string;
    label?: string;
    uploadedAt?: any;
    size?: number;
    contentType?: string;
    publicReadable?: boolean;
    isLegacy?: boolean;
}

const ACCEPTED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_BYTES = 25 * 1024 * 1024;

const authHeaders = () => ({ 'Authorization': `Bearer ${sessionStorage.getItem('adminPassword') || ''}` });

// The API returns Firestore timestamps as {_seconds}; older code paths may give {seconds}.
const uploadedDate = (ts: any): string => {
    const seconds = ts?._seconds ?? ts?.seconds;
    return typeof seconds === 'number' ? new Date(seconds * 1000).toLocaleDateString() : '—';
};

const formatSize = (bytes?: number) =>
    !bytes ? '' : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const ContractsTab: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [label, setLabel] = useState('');
    const [search, setSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchContracts = async () => {
        try {
            const res = await fetch('/api/manage-contracts', { headers: authHeaders() });
            if (!res.ok) throw new Error(res.status === 401 ? 'Contracts are limited to the main admin keys.' : 'Could not load contracts.');
            setContracts((await res.json()).contracts || []);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load contracts.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchContracts(); }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file) { setError('Choose a file to upload.'); return; }
        if (!ACCEPTED.includes(file.type)) { setError('Only PDF and Word documents (.pdf, .doc, .docx) can be uploaded.'); return; }
        if (file.size > MAX_BYTES) { setError('That file is over 25 MB.'); return; }

        setIsUploading(true); setError(''); setNotice('');
        try {
            // 1. Ask for a one-time private upload link. 2. Send the file straight to storage. 3. Record it.
            const urlRes = await fetch('/api/manage-contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ action: 'get-upload-url', fileName: file.name, fileType: file.type }),
            });
            const urlData = await urlRes.json();
            if (!urlRes.ok) throw new Error(urlData.error || 'Could not start the upload.');

            const put = await fetch(urlData.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
            if (!put.ok) throw new Error('The upload to storage failed. Please try again.');

            const saveRes = await fetch('/api/manage-contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ action: 'save', key: urlData.key, fileName: file.name, label }),
            });
            const saveData = await saveRes.json();
            if (!saveRes.ok) throw new Error(saveData.error || 'Could not save the document.');

            setNotice(saveData.publicReadable
                ? 'Saved — but storage is currently letting anyone with the link read files in this folder. See the warning on the document.'
                : 'Contract saved privately.');
            setLabel('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            await fetchContracts();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    // A view link is created fresh on every click and expires in 5 minutes.
    const handleView = async (c: Contract) => {
        setBusyId(c.id); setError('');
        const tab = window.open('', '_blank'); // opened now so the popup blocker allows it
        try {
            const res = await fetch(`/api/manage-contracts?id=${encodeURIComponent(c.id)}`, { headers: authHeaders() });
            const data = await res.json();
            if (!res.ok || !data.viewUrl) throw new Error(data.error || 'Could not open this document.');
            if (tab) { tab.opener = null; tab.location.href = data.viewUrl; }
        } catch (err) {
            tab?.close();
            setError(err instanceof Error ? err.message : 'Could not open this document.');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (c: Contract) => {
        if (!window.confirm(`Permanently delete "${c.label || c.fileName}"? The stored file is removed too.`)) return;
        setBusyId(c.id); setError('');
        try {
            const res = await fetch(`/api/manage-contracts?id=${encodeURIComponent(c.id)}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not delete this document.');
            await fetchContracts();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete this document.');
        } finally {
            setBusyId(null);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    const q = search.trim().toLowerCase();
    const shown = contracts.filter(c => !q || `${c.label || ''} ${c.fileName}`.toLowerCase().includes(q));

    return (
        <div className="space-y-8 pb-24">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Contracts</h2>
                <p className="text-gray-500 mt-1 uppercase font-bold tracking-widest text-[10px]">Private storage for filmmaker contracts and deal memos. Main admin keys only. Documents open through a link that expires in 5 minutes.</p>
            </div>

            {error && <p role="alert" className="text-red-400 text-xs font-bold">{error}</p>}
            {notice && <p role="status" className="text-green-400 text-xs font-bold">{notice}</p>}

            <form onSubmit={handleUpload} className="bg-[#0f0f0f] border border-white/5 p-6 md:p-8 rounded-[2rem] grid gap-5 md:grid-cols-[1fr_1fr_auto] items-end">
                <div>
                    <label htmlFor="contract-label" className="form-label">Filmmaker / film (optional)</label>
                    <input id="contract-label" type="text" value={label} onChange={e => setLabel(e.target.value)} maxLength={150} placeholder="e.g. Jane Doe — Night Shift" className="form-input bg-black/40 border-white/10" />
                </div>
                <div>
                    <label htmlFor="contract-file" className="form-label">Document (PDF or Word, max 25 MB)</label>
                    <input id="contract-file" ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,application/pdf" className="text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                </div>
                <button type="submit" disabled={isUploading} className="bg-white text-black font-black py-3 px-8 rounded-xl uppercase text-xs tracking-widest disabled:opacity-50">
                    {isUploading ? 'Uploading…' : 'Upload'}
                </button>
            </form>

            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Documents ({contracts.length})</h3>
                    <input id="contract-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" aria-label="Search contracts" className="form-input bg-black/40 border-white/10 !w-full sm:!w-64 text-xs" />
                </div>

                {shown.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-30">
                        <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-sm">{contracts.length === 0 ? 'No contracts yet' : 'No matches'}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-white/5 border border-white/10 rounded-3xl overflow-hidden bg-black">
                        {shown.map(c => (
                            <li key={c.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-white font-black uppercase tracking-tight break-words">{c.label || c.fileName}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1 break-words">
                                        {c.label ? `${c.fileName} · ` : ''}{uploadedDate(c.uploadedAt)}{c.size ? ` · ${formatSize(c.size)}` : ''}
                                    </p>
                                    {c.publicReadable && (
                                        <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-amber-400">
                                            ⚠ Storage lets anyone with the link read this file. Ask your developer to make the contracts/ folder private.
                                        </p>
                                    )}
                                    {c.isLegacy && (
                                        <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-amber-400">
                                            ⚠ Older upload with a permanent public link. Re-upload it here, then delete this one.
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleView(c)} disabled={busyId === c.id} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 border border-cyan-500/20 rounded-lg px-4 py-2 hover:bg-cyan-500/10 disabled:opacity-50">
                                        {busyId === c.id ? 'Opening…' : 'View'}
                                    </button>
                                    <button onClick={() => handleDelete(c)} disabled={busyId === c.id} className="text-[10px] font-black uppercase tracking-widest text-red-500 border border-red-500/20 rounded-lg px-4 py-2 hover:bg-red-500/10 disabled:opacity-50">
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ContractsTab;
