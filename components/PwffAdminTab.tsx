import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import { PwffInterestEntry } from '../types';

interface PwffAdminTabProps {
    pwffVisible: boolean;
    pwffBlocks?: any[];
    pwffDate: string;
    pwffName: string;
    pwffDescription: string;
    pwffTagline: string;
    pwffYear: string;
    onToggleVisible: (val: boolean) => void;
    onChangeDate: (val: string) => void;
    onChangeName: (val: string) => void;
    onChangeDescription: (val: string) => void;
    onChangeTagline: (val: string) => void;
    onChangeYear: (val: string) => void;
    onSave: () => void;
    isSaving: boolean;
}

const PwffAdminTab: React.FC<PwffAdminTabProps> = ({
    pwffVisible, pwffDate, pwffName, pwffDescription, pwffTagline, pwffYear, pwffBlocks = [],
    onToggleVisible, onChangeDate, onChangeName, onChangeDescription, onChangeTagline, onChangeYear,
    onSave, isSaving
}) => {
    const [emails, setEmails] = useState<(PwffInterestEntry & { id: string })[]>([]);
    const [viewCount, setViewCount] = useState(0);
    const [loadingEmails, setLoadingEmails] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [search, setSearch] = useState('');
    const [inviteText, setInviteText] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteResult, setInviteResult] = useState<{sent:number;alreadyInvited:number;errors:number} | null>(null);
    const [invites, setInvites] = useState<any[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(true);

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
        db.collection('pwff_invites').orderBy('invitedAt', 'desc').get().then(snap => {
            setInvites(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingInvites(false);
        }).catch(() => setLoadingInvites(false));

        db.collection('pwff_interest').orderBy('submittedAt', 'desc').get().then(snap => {
            setEmails(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PwffInterestEntry & { id: string })));
            setLoadingEmails(false);
        }).catch(() => setLoadingEmails(false));
        db.collection('pwff_analytics').doc('views').get().then(doc => {
            if (doc.exists) setViewCount(doc.data()?.total || 0);
        });
    }, []);

    const filtered = emails.filter(e =>
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        (e.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const [notifyLoading, setNotifyLoading] = useState(false);
    const [notifyResult, setNotifyResult] = useState<{sent:number;errors:number;total:number} | null>(null);
    const [notifyImageUrl, setNotifyImageUrl] = useState('');
    const [importText, setImportText] = useState('');
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState('');

    const importEmails = async () => {
        const db = getDbInstance();
        if (!db) return;
        const parsed = importText.split(/[,\n\r]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@') && e.includes('.'));
        if (!parsed.length) { setImportResult('No valid emails found'); return; }
        setImportLoading(true);
        setImportResult('');
        let added = 0; let skipped = 0;
        // Check which already exist
        const existing = new Set(emails.map(e => e.email.toLowerCase()));
        for (const email of parsed) {
            if (existing.has(email)) { skipped++; continue; }
            try {
                const ref = await db.collection('pwff_interest').add({ email, source: 'admin-import', submittedAt: new Date() });
                setEmails(prev => [...prev, { id: ref.id, email, source: 'admin-import', submittedAt: { toDate: () => new Date() } as any }]);
                existing.add(email);
                added++;
            } catch { skipped++; }
        }
        setImportResult(`✓ Added ${added} email${added !== 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} already on list` : ''}`);
        setImportText('');
        setImportLoading(false);
    };

    const copyEmails = () => {
        navigator.clipboard.writeText(filtered.map(e => e.email).join('\n')).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const downloadCSV = () => {
        const rows = [['Email', 'Name', 'Source', 'Date']];
        filtered.forEach(e => {
            const date = e.submittedAt?.toDate ? e.submittedAt.toDate().toLocaleDateString() : '';
            rows.push([e.email, e.name || '', e.source || '', date]);
        });
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pwff-interest-list-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const notifyLive = async () => {
        if (!window.confirm(`Send "Festival is Live" email to all ${emails.length} subscribers? This cannot be undone.`)) return;
        setNotifyLoading(true);
        setNotifyResult(null);
        try {
            const res = await fetch('/api/pwff-notify-live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    festivalName: 'Playhouse West Film Festival 2026', 
                    festivalUrl: 'https://cratetv.net/pwff-philly2026',
                    bannerImageUrl: notifyImageUrl || null
                })
            });
            const data = await res.json();
            setNotifyResult(data);
        } catch {
            setNotifyResult({ sent: 0, errors: 1, total: 0 });
        }
        setNotifyLoading(false);
    };

    const BlockInviteSection: React.FC<{block: any}> = ({ block }) => {
        const [blockEmails, setBlockEmails] = useState('');
        return (
            <div className="space-y-2 border border-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-amber-400">{block.title} — ${block.price || 10}</label>
                    <span className="text-[9px] text-gray-600">Block access only</span>
                </div>
                <textarea
                    value={blockEmails}
                    onChange={e => setBlockEmails(e.target.value)}
                    placeholder="email1@gmail.com — one per line or comma separated"
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 resize-none font-mono"
                />
                <button
                    onClick={() => sendInvites('block', block.id, block.title, blockEmails)}
                    disabled={inviteLoading || !blockEmails.trim()}
                    className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all"
                >
                    {inviteLoading ? 'Sending...' : `Send Block Invites for "${block.title}"`}
                </button>
            </div>
        );
    };

    const sendInvites = async (accessType: 'full' | 'block' = 'full', blockId?: string, blockTitle?: string, overrideText?: string) => {
        const text = overrideText ?? inviteText;
        const emails = text.split(/[,\n\r]+/).map((e: string) => e.trim()).filter((e: string) => e.includes('@'));
        if (!emails.length) return;
        setInviteLoading(true);
        setInviteResult(null);
        try {
            const res = await fetch('/api/pwff-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    password: sessionStorage.getItem('adminPassword'),
                    emails,
                    festivalName: 'Playhouse West Film Festival',
                    festivalYear: '2026',
                    accessType,
                    blockId: blockId || null,
                    blockTitle: blockTitle || null,
                })
            });
            const data = await res.json();
            if (data.success) setInviteResult(data.results);
        } catch {}
        setInviteLoading(false);
    };

    return (
        <div className="space-y-8 text-gray-200">
            <div>
                <h2 className="text-2xl font-bold text-pink-400 mb-1">🎬 PWFF — Playhouse West Film Festival</h2>
                <p className="text-gray-400 text-sm">All content on <code className="text-pink-300 bg-white/5 px-1.5 py-0.5 rounded">cratetv.net/pwff</code> is controlled from here.</p>
            </div>

            {/* ── PAGE SETTINGS ─────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-xl p-6 space-y-6 border border-white/5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Page Settings</h3>

                {/* Visibility toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                    <div>
                        <p className="font-bold text-white text-sm">Show Full Programme</p>
                        <p className="text-xs text-gray-500 mt-0.5">OFF = teaser with email capture. ON = full schedule visible to public.</p>
                    </div>
                    <button
                        onClick={() => onToggleVisible(!pwffVisible)}
                        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${pwffVisible ? 'bg-green-500' : 'bg-gray-700'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${pwffVisible ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                {/* Festival name */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Festival Name</label>
                    <input
                        type="text"
                        value={pwffName}
                        onChange={e => onChangeName(e.target.value)}
                        placeholder="e.g. Playhouse West Film Festival"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-[10px] text-gray-600">Appears as the main title on the teaser and programme page</p>
                </div>

                {/* Festival date */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Festival Date</label>
                    <input
                        type="text"
                        value={pwffDate}
                        onChange={e => onChangeDate(e.target.value)}
                        placeholder="e.g. August 14–16, 2026"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-[10px] text-gray-600">Shown prominently on the teaser. Free text — write it exactly how you want it to appear.</p>
                </div>

                {/* Tagline */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Tagline</label>
                    <input
                        type="text"
                        value={pwffTagline}
                        onChange={e => onChangeTagline(e.target.value)}
                        placeholder="e.g. Presented by Crate TV  ·  Philadelphia, PA"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-[10px] text-gray-600">Short line under the festival name. Changes every year.</p>
                </div>

                {/* URL Year */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Festival Year (URL)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm font-mono">cratetv.net/pwff</span>
                        <input
                            type="text"
                            value={pwffYear}
                            onChange={e => onChangeYear(e.target.value)}
                            placeholder="2026"
                            maxLength={4}
                            className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-pink-500"
                        />
                    </div>
                    <p className="text-[10px] text-gray-600">The full URL will be <span className="text-pink-400 font-mono">cratetv.net/pwff{pwffYear || '2026'}</span> — update each year</p>
                </div>

                {/* Description */}
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Description / Festival Theme</label>
                    <textarea
                        value={pwffDescription}
                        onChange={e => onChangeDescription(e.target.value)}
                        placeholder="Describe this year's festival theme, vision, or what audiences can expect..."
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 resize-none"
                    />
                    <p className="text-[10px] text-gray-600">Shown on the teaser and at the top of the programme. Update this for each festival.</p>
                </div>

                {/* Preview */}
                {(pwffName || pwffDate || pwffDescription) && (
                    <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-3">Live Preview</p>
                        <div className="text-center space-y-2">
                            <p className="text-[10px] text-pink-400 font-mono mb-2">cratetv.net/pwff{pwffYear || '2026'}</p>
                        {pwffName && <p className="font-black text-white text-lg uppercase tracking-tight">{pwffName}</p>}
                            {pwffTagline && <p className="text-xs text-gray-500">{pwffTagline}</p>}
                            {pwffDate && <p className="text-sm font-bold text-gray-400">{pwffDate}</p>}
                            {pwffDescription && <p className="text-xs text-gray-500 leading-relaxed mt-2 max-w-sm mx-auto">{pwffDescription}</p>}
                        </div>
                    </div>
                )}

                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-all"
                >
                    {isSaving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            {/* ── STATS ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-xl p-5 border border-white/5 text-center">
                    <p className="text-3xl font-black text-white">{viewCount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Page Views</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-white/5 text-center">
                    <p className="text-3xl font-black text-white">{emails.length}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Email Signups</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-white/5 text-center">
                    <p className="text-3xl font-black text-white">
                        {viewCount > 0 ? `${Math.round((emails.length / viewCount) * 100)}%` : '—'}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Conversion</p>
                </div>
            </div>

            {emails.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-xl p-4 border border-white/5">
                        <p className="text-lg font-black text-white">{emails.filter(e => e.source === 'teaser').length}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">From Teaser</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-white/5">
                        <p className="text-lg font-black text-white">{emails.filter(e => e.source === 'programme').length}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">From Programme</p>
                    </div>
                </div>
            )}

            {/* ── VIRTUAL PASS INVITES ──────────────────────────────────── */}
            <div className="bg-gray-900 rounded-xl p-6 space-y-6 border border-white/5">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-1">Send Virtual Pass Invites</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">Paste email addresses from Tony below. Full pass holders get access to everything. Block ticket holders only get access to their specific block.</p>
                </div>

                {/* Full Festival Pass */}
                <div className="space-y-2 border border-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-green-400">Full Festival Pass — $50</label>
                        <span className="text-[9px] text-gray-600">Gets access to all blocks</span>
                    </div>
                    <textarea
                        value={inviteText}
                        onChange={e => setInviteText(e.target.value)}
                        placeholder="email1@gmail.com, email2@gmail.com — one per line or comma separated"
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500 resize-none font-mono"
                    />
                    <button
                        onClick={() => sendInvites('full')}
                        disabled={inviteLoading || !inviteText.trim()}
                        className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all"
                    >
                        {inviteLoading ? 'Sending...' : 'Send Full Pass Invites'}
                    </button>
                </div>

                {/* Block Tickets */}
                {[...new Set((pwffBlocks || []).map((b: any) => b.id))].length > 0 ? (
                    (pwffBlocks || []).map((block: any) => (
                        <BlockInviteSection key={block.id} block={block} />
                    ))
                ) : (
                    <div className="border border-dashed border-white/10 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-600">No festival blocks found. Add blocks in Festival Hub first, then come back to invite block ticket holders.</p>
                    </div>
                )}

                {inviteResult && (
                    <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4 space-y-1">
                        <p className="text-sm font-bold text-green-400">Done!</p>
                        <p className="text-xs text-gray-400">Sent: <span className="text-white font-bold">{inviteResult.sent}</span></p>
                        <p className="text-xs text-gray-400">Already invited: <span className="text-white font-bold">{inviteResult.alreadyInvited}</span></p>
                        {inviteResult.errors > 0 && <p className="text-xs text-red-400">Failed: {inviteResult.errors}</p>}
                    </div>
                )}
            </div>

            {/* ── INVITE TRACKING ───────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Virtual Pass Tracking ({invites.length} invited)</h3>
                    <div className="flex gap-4 text-xs flex-wrap">
                        <span className="text-gray-500">Signed up: <span className="text-white font-bold">{invites.filter(i => i.accessGranted).length}</span></span>
                        <span className="text-gray-500">Watched: <span className="text-blue-400 font-bold">{invites.filter(i => i.status === 'watched').length}</span></span>
                        <span className="text-gray-500">Pending: <span className="text-amber-400 font-bold">{invites.filter(i => !i.accessGranted).length}</span></span>
                    </div>
                </div>
                {loadingInvites ? (
                    <div className="p-8 text-center text-gray-600 text-sm">Loading...</div>
                ) : invites.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 text-sm">No invites sent yet.</div>
                ) : (
                    <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                        {invites.map(invite => (
                            <div key={invite.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <p className="text-sm text-white font-mono">{invite.email}</p>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {invite.status === 'watched' ? (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400">
                                            Watched ({invite.watchedMovies?.length || 0} films)
                                        </span>
                                    ) : invite.accessGranted ? (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">
                                            Signed Up
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">
                                            Pending
                                        </span>
                                    )}
                                    {invite.invitedAt && (
                                        <p className="text-[9px] text-gray-600">{new Date(invite.invitedAt).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── MANUAL EMAIL IMPORT ───────────────────────────────────── */}
            <div className="bg-gray-900 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-1">Add Emails to Interest List</h3>
                    <p className="text-[11px] text-gray-600">Paste existing Crate users or ticket holders here — one per line or comma separated. They'll be added to the list and included in the "Festival is Live" blast.</p>
                </div>
                <div className="p-4 space-y-3">
                    <textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder={"email1@gmail.com\nemail2@gmail.com\nor email1, email2, email3"}
                        rows={4}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 resize-none font-mono placeholder-gray-700"
                    />
                    <div className="flex items-center justify-between gap-3">
                        {importResult && (
                            <p className={`text-xs font-bold ${importResult.includes('✓') ? 'text-green-400' : 'text-amber-400'}`}>{importResult}</p>
                        )}
                        <button
                            onClick={importEmails}
                            disabled={importLoading || !importText.trim()}
                            className="ml-auto bg-white text-black font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all"
                        >
                            {importLoading ? 'Adding...' : 'Add to List'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── EMAIL LIST ────────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                        Festival Interest List ({filtered.length})
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 w-40"
                        />
                        <button onClick={copyEmails} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
                            {copySuccess ? '✓ Copied!' : 'Copy All'}
                        </button>
                        <button onClick={downloadCSV} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/20 text-blue-400 transition-all">
                            ↓ CSV
                        </button>
                        <button
                            onClick={notifyLive}
                            disabled={notifyLoading || emails.length === 0}
                            className="text-xs font-bold px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-all"
                        >
                            {notifyLoading ? 'Sending...' : `🎬 Notify ${emails.length} — Festival is Live`}
                        </button>
                    </div>
                    {/* Image URL for blast email */}
                    <div className="flex items-center gap-2 px-4 pb-3 border-b border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex-shrink-0">Poster in email:</span>
                        <input
                            type="text"
                            value={notifyImageUrl}
                            onChange={e => setNotifyImageUrl(e.target.value)}
                            placeholder="Paste S3 image URL (optional — adds poster to the blast email)"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-red-500/40 transition-all"
                        />
                        {notifyImageUrl && (
                            <img src={notifyImageUrl} alt="preview" className="w-10 h-10 object-cover rounded-lg border border-white/10 flex-shrink-0" />
                        )}
                    </div>
                </div>
                {notifyResult && (
                    <div className={`px-4 py-3 text-xs font-bold border-b border-white/5 ${notifyResult.errors > 0 ? 'text-amber-400 bg-amber-900/10' : 'text-green-400 bg-green-900/10'}`}>
                        {notifyResult.errors === 0
                            ? `✓ Sent to ${notifyResult.sent} subscribers successfully`
                            : `Sent: ${notifyResult.sent} · Errors: ${notifyResult.errors} of ${notifyResult.total}`}
                    </div>
                )}
                {loadingEmails ? (
                    <div className="p-8 text-center text-gray-600 text-sm">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 text-sm">
                        {emails.length === 0 ? 'No signups yet — share the page!' : 'No results.'}
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                        {filtered.map(entry => (
                            <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div>
                                    {entry.name && <p className="text-sm font-bold text-white">{entry.name}</p>}
                                    <p className={entry.name ? 'text-xs text-gray-500' : 'text-sm text-white'}>{entry.email}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${entry.source === 'teaser' ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                        {entry.source}
                                    </span>
                                    {entry.submittedAt?.toDate && (
                                        <p className="text-[9px] text-gray-600 mt-0.5">{entry.submittedAt.toDate().toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PwffAdminTab;
