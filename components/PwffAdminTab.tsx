import React, { useState, useEffect } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import { PwffInterestEntry } from '../types';

interface PwffAdminTabProps {
    pwffVisible: boolean;
    pwffDate: string;
    pwffName: string;
    pwffDescription: string;
    pwffTagline: string;
    onToggleVisible: (val: boolean) => void;
    onChangeDate: (val: string) => void;
    onChangeName: (val: string) => void;
    onChangeDescription: (val: string) => void;
    onChangeTagline: (val: string) => void;
    onSave: () => void;
    isSaving: boolean;
}

const PwffAdminTab: React.FC<PwffAdminTabProps> = ({
    pwffVisible, pwffDate, pwffName, pwffDescription, pwffTagline,
    onToggleVisible, onChangeDate, onChangeName, onChangeDescription, onChangeTagline,
    onSave, isSaving
}) => {
    const [emails, setEmails] = useState<(PwffInterestEntry & { id: string })[]>([]);
    const [viewCount, setViewCount] = useState(0);
    const [loadingEmails, setLoadingEmails] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const db = getDbInstance();
        if (!db) return;
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

    const copyEmails = () => {
        navigator.clipboard.writeText(filtered.map(e => e.email).join('\n')).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
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

            {/* ── EMAIL LIST ────────────────────────────────────────────── */}
            <div className="bg-gray-900 rounded-xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
                        Festival Interest List ({filtered.length})
                    </h3>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500 w-40"
                        />
                        <button
                            onClick={copyEmails}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        >
                            {copySuccess ? '✓ Copied!' : 'Copy All'}
                        </button>
                    </div>
                </div>
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
