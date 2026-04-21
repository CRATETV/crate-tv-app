import React, { useState } from 'react';

const CC_LICENSES: Record<string, { name: string; color: string; commercial: boolean; description: string }> = {
    'CC BY': {
        name: 'CC BY',
        color: '#22c55e',
        commercial: true,
        description: 'Most permissive. Anyone can use, share, and adapt — even commercially — as long as they credit the creator. Crate can host freely.',
    },
    'CC BY-SA': {
        name: 'CC BY-SA',
        color: '#22c55e',
        commercial: true,
        description: 'Use and adapt freely with credit. Derivatives must use the same license. Crate can host freely.',
    },
    'CC BY-NC': {
        name: 'CC BY-NC',
        color: '#f59e0b',
        commercial: false,
        description: 'Free to share with credit but NO commercial use. Since Crate has paid tiers, this film should only go in the free catalog.',
    },
    'CC BY-NC-SA': {
        name: 'CC BY-NC-SA',
        color: '#f59e0b',
        commercial: false,
        description: 'Non-commercial only, share alike. Free catalog only on Crate. Cannot be placed behind a paywall.',
    },
    'CC BY-ND': {
        name: 'CC BY-ND',
        color: '#3b82f6',
        commercial: true,
        description: 'Can share with credit but NO derivatives or adaptations. Crate can host as-is, cannot edit or clip.',
    },
    'CC BY-NC-ND': {
        name: 'CC BY-NC-ND',
        color: '#ef4444',
        commercial: false,
        description: 'Most restrictive CC license. Non-commercial and no derivatives. Free catalog only, no editing or clipping.',
    },
    'Public Domain': {
        name: 'Public Domain',
        color: '#a855f7',
        commercial: true,
        description: 'No copyright restrictions at all. Crate can use freely in any way — free or paid catalog, clips, anything.',
    },
};

interface FilmmakerResult {
    name: string;
    email?: string;
    contactSource?: string;
    filmTitle: string;
    filmUrl?: string;
    genre?: string;
    bio?: string;
    reason?: string;
    licenseType?: string;
    year?: string;
    description?: string;
}

type OutreachStatus = 'idle' | 'searching' | 'done' | 'error';
type DraftStatus = 'idle' | 'drafting' | 'done';
type SendStatus = Record<string, 'idle' | 'sending' | 'sent' | 'error'>;

const FilmmakerOutreachTab: React.FC = () => {
    const [mode, setMode] = useState<'filmmaker' | 'cc'>('filmmaker');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<OutreachStatus>('idle');
    const [results, setResults] = useState<FilmmakerResult[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [drafts, setDrafts] = useState<Record<number, string>>({});
    const [draftStatus, setDraftStatus] = useState<Record<number, DraftStatus>>({});
    const [editingDraft, setEditingDraft] = useState<Record<number, string>>({});
    const [sendStatus, setSendStatus] = useState<SendStatus>({});
    const [editingSubject, setEditingSubject] = useState<Record<number, string>>({});
    const [showLicenses, setShowLicenses] = useState(false);

    const search = async () => {
        if (!query.trim()) return;
        setStatus('searching');
        setResults([]);
        setDrafts({});
        setDraftStatus({});
        setSendStatus({});
        try {
            const res = await fetch('/api/filmmaker-outreach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'search', query, mode }),
            });
            const data = await res.json();
            if (data.success) {
                setResults(data.results || []);
                setStatus('done');
            } else {
                setErrorMsg(data.error || 'Search failed');
                setStatus('error');
            }
        } catch {
            setErrorMsg('Network error — check your connection');
            setStatus('error');
        }
    };

    const draftEmail = async (index: number, filmmaker: FilmmakerResult) => {
        setDraftStatus(p => ({ ...p, [index]: 'drafting' }));
        try {
            const res = await fetch('/api/filmmaker-outreach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'draft', filmmaker }),
            });
            const data = await res.json();
            if (data.success) {
                setDrafts(p => ({ ...p, [index]: data.draft }));
                setEditingDraft(p => ({ ...p, [index]: data.draft }));
                setDraftStatus(p => ({ ...p, [index]: 'done' }));
                setEditingSubject(p => ({ ...p, [index]: `Your film on Crate TV — an invitation` }));
            }
        } catch {
            setDraftStatus(p => ({ ...p, [index]: 'idle' }));
        }
    };

    const sendEmail = async (index: number, filmmaker: FilmmakerResult) => {
        if (!filmmaker.email) return;
        setSendStatus(p => ({ ...p, [index]: 'sending' }));
        try {
            const res = await fetch('/api/filmmaker-outreach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    emailData: {
                        to: filmmaker.email,
                        subject: editingSubject[index] || `Your film on Crate TV — an invitation`,
                        body: editingDraft[index] || drafts[index],
                        filmTitle: filmmaker.filmTitle,
                    },
                }),
            });
            const data = await res.json();
            setSendStatus(p => ({ ...p, [index]: data.success ? 'sent' : 'error' }));
        } catch {
            setSendStatus(p => ({ ...p, [index]: 'error' }));
        }
    };

    const suggestedQueries = mode === 'filmmaker'
        ? ['Short film directors who submitted to Sundance 2024', 'Film school graduates 2024 seeking distribution', 'Independent drama directors on Vimeo', 'First-time feature directors festival circuit 2024']
        : ['Drama short films CC license on Vimeo', 'Documentary films Creative Commons on Internet Archive', 'Narrative short films CC BY license', 'Independent films Public Domain 1920s 1930s'];

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <p className="text-blue-400 font-black uppercase tracking-[0.4em] text-[10px]">Filmmaker Outreach Engine</p>
                </div>
                <button
                    onClick={() => setShowLicenses(!showLicenses)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors border border-white/5 hover:border-white/20 px-4 py-2 rounded-xl"
                >
                    {showLicenses ? 'Hide' : 'View'} License Guide
                </button>
            </div>

            {/* License Guide */}
            {showLicenses && (
                <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white italic mb-6">Creative Commons License Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(CC_LICENSES).map(([key, lic]) => (
                            <div key={key} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-black text-sm" style={{ color: lic.color }}>{lic.name}</span>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${lic.commercial ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {lic.commercial ? 'Commercial OK' : 'Non-commercial only'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed">{lic.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mode Toggle */}
            <div className="flex gap-3">
                {[
                    { id: 'filmmaker', label: 'Filmmaker Outreach', icon: '🎬', desc: 'Find indie filmmakers to invite' },
                    { id: 'cc', label: 'Creative Commons', icon: '🔓', desc: 'Find CC licensed films to add' },
                ].map(m => (
                    <button
                        key={m.id}
                        onClick={() => { setMode(m.id as any); setResults([]); setStatus('idle'); }}
                        className={`flex-1 p-5 rounded-2xl border text-left transition-all ${mode === m.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                    >
                        <div className="text-xl mb-2">{m.icon}</div>
                        <p className={`font-black text-sm uppercase tracking-widest ${mode === m.id ? 'text-blue-400' : 'text-white'}`}>{m.label}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{m.desc}</p>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
                        {mode === 'filmmaker' ? 'Describe the filmmakers you want to find' : 'Describe the Creative Commons films you want'}
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && search()}
                            placeholder={mode === 'filmmaker' ? 'e.g. Short film directors on festival circuit 2024...' : 'e.g. Drama short films CC BY license on Vimeo...'}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-blue-500/40 transition-all"
                        />
                        <button
                            onClick={search}
                            disabled={status === 'searching' || !query.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black px-8 py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                        >
                            {status === 'searching' ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>

                {/* Suggested queries */}
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-700 mb-2">Try these</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedQueries.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => setQuery(q)}
                                className="text-[10px] text-gray-600 hover:text-white border border-white/5 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Searching state */}
            {status === 'searching' && (
                <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-[2.5rem] text-center">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-blue-400 font-black uppercase tracking-widest text-[10px]">Searching the web for filmmakers...</p>
                    <p className="text-gray-700 text-xs mt-2">Claude is browsing Vimeo, FilmFreeway, film school showcases, and festival sites</p>
                </div>
            )}

            {/* Error */}
            {status === 'error' && (
                <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl">
                    <p className="text-red-400 font-black text-sm">{errorMsg}</p>
                </div>
            )}

            {/* Results */}
            {status === 'done' && results.length === 0 && (
                <div className="text-center py-16 border border-white/5 rounded-[2.5rem]">
                    <p className="text-gray-600 font-black uppercase tracking-widest text-[10px]">No results found — try a different search</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
                    {results.map((filmmaker, i) => {
                        const licInfo = filmmaker.licenseType ? CC_LICENSES[filmmaker.licenseType] : null;
                        const sent = sendStatus[i] === 'sent';
                        return (
                            <div key={i} className={`bg-[#0f0f0f] border p-8 rounded-[2.5rem] space-y-6 transition-all ${sent ? 'border-green-500/30 bg-green-500/[0.02]' : 'border-white/5'}`}>

                                {/* Filmmaker info */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap mb-2">
                                            <p className="text-white font-black text-lg">{filmmaker.name}</p>
                                            {licInfo && (
                                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border" style={{ color: licInfo.color, borderColor: licInfo.color + '44', backgroundColor: licInfo.color + '11' }}>
                                                    {licInfo.name}
                                                </span>
                                            )}
                                            {licInfo && (
                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${licInfo.commercial ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                    {licInfo.commercial ? 'Free or paid catalog' : 'Free catalog only'}
                                                </span>
                                            )}
                                            {sent && <span className="text-[8px] font-black text-green-400 uppercase tracking-widest">Sent</span>}
                                        </div>
                                        <p className="text-red-400 font-bold text-sm mb-1">{filmmaker.filmTitle}</p>
                                        {filmmaker.genre && <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{filmmaker.genre} {filmmaker.year && `· ${filmmaker.year}`}</p>}
                                        {filmmaker.bio && <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{filmmaker.bio}</p>}
                                        {filmmaker.description && <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{filmmaker.description}</p>}
                                        {filmmaker.reason && <p className="text-[10px] text-blue-400 italic">{filmmaker.reason}</p>}
                                        {licInfo && filmmaker.licenseType && (
                                            <p className="text-[10px] text-gray-600 mt-2 italic">{licInfo.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                                            {filmmaker.email && <p className="text-[10px] text-blue-400 font-mono">{filmmaker.email}</p>}
                                            {filmmaker.filmUrl && (
                                                <a href={filmmaker.filmUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gray-600 hover:text-white transition-colors underline">
                                                    View film ↗
                                                </a>
                                            )}
                                            {filmmaker.contactSource && !filmmaker.email && (
                                                <a href={filmmaker.contactSource} target="_blank" rel="noreferrer" className="text-[10px] text-gray-600 hover:text-white transition-colors underline">
                                                    Contact page ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Draft button */}
                                    {!drafts[i] && (
                                        <button
                                            onClick={() => draftEmail(i, filmmaker)}
                                            disabled={draftStatus[i] === 'drafting'}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-3 px-6 rounded-xl text-[9px] uppercase tracking-widest transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                                        >
                                            {draftStatus[i] === 'drafting' ? 'Drafting...' : 'Draft Email'}
                                        </button>
                                    )}
                                </div>

                                {/* Email draft */}
                                {drafts[i] && (
                                    <div className="space-y-4 border-t border-white/5 pt-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Outreach Email</p>
                                            {filmmaker.email && sendStatus[i] !== 'sent' && (
                                                <button
                                                    onClick={() => draftEmail(i, filmmaker)}
                                                    className="text-[9px] text-gray-600 hover:text-white transition-colors uppercase tracking-widest font-black"
                                                >
                                                    Regenerate
                                                </button>
                                            )}
                                        </div>

                                        {/* Subject */}
                                        <input
                                            type="text"
                                            value={editingSubject[i] || ''}
                                            onChange={e => setEditingSubject(p => ({ ...p, [i]: e.target.value }))}
                                            placeholder="Email subject..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-blue-500/30 transition-all"
                                        />

                                        {/* Body */}
                                        <textarea
                                            value={editingDraft[i] || drafts[i]}
                                            onChange={e => setEditingDraft(p => ({ ...p, [i]: e.target.value }))}
                                            rows={10}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-gray-300 text-sm leading-relaxed focus:outline-none focus:border-blue-500/30 transition-all resize-none font-mono"
                                        />

                                        {/* Send / status */}
                                        {filmmaker.email ? (
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => sendEmail(i, filmmaker)}
                                                    disabled={sendStatus[i] === 'sending' || sent}
                                                    className={`font-black py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95 ${sent ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-60`}
                                                >
                                                    {sent ? 'Sent' : sendStatus[i] === 'sending' ? 'Sending...' : `Send to ${filmmaker.email}`}
                                                </button>
                                                {sendStatus[i] === 'error' && (
                                                    <p className="text-red-400 text-[10px]">Send failed — check email address</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                                <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">No email found automatically</p>
                                                <p className="text-gray-600 text-[10px]">Visit their contact page or social profile to find their email, then copy and send this draft manually.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FilmmakerOutreachTab;
