import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ACCENT } from './ui';
import { TAB_GROUPS, TAB_META } from './tabMeta';

// The admin navigation: grouped, searchable (press / or ⌘K), with badges.

interface Props {
    allowedTabs: string[];
    activeTab: string;
    onNavigate: (id: string) => void;
    badges: Record<string, number>;
    operatorName: string;
    jobTitle?: string;
    onLogout: () => void;
}

const AdminSidebar: React.FC<Props> = ({ allowedTabs, activeTab, onNavigate, badges, operatorName, jobTitle, onLogout }) => {
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
            if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return allowedTabs
            .filter(id => TAB_META[id])
            .map(id => {
                const m = TAB_META[id];
                const hay = `${m.label} ${m.desc} ${m.keywords || ''} ${id}`.toLowerCase();
                const score = m.label.toLowerCase().startsWith(q) ? 3 : m.label.toLowerCase().includes(q) ? 2 : hay.includes(q) ? 1 : 0;
                return { id, score };
            })
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(r => r.id);
    }, [query, allowedTabs]);

    const go = (id: string) => { onNavigate(id); setQuery(''); };

    // A plain render function (not a nested component), so items aren't remounted on every render.
    const renderItem = (id: string, accent: string, showDesc?: boolean) => {
        const m = TAB_META[id];
        const active = id === activeTab;
        const badge = badges[id] || 0;
        return (
            <button
                key={id}
                onClick={() => go(id)}
                className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${active ? 'text-white' : 'text-[#A1A1AD] hover:text-white hover:bg-white/[0.04]'}`}
                style={active ? { background: `${accent}1C` } : undefined}
                aria-current={active ? 'page' : undefined}
            >
                {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: accent }} />}
                <span className="text-[17px] w-6 text-center" aria-hidden>{m.icon}</span>
                <span className="flex-1 min-w-0">
                    <span className={`block text-[14px] truncate ${active ? 'font-bold' : 'font-medium'}`}>{m.label}</span>
                    {showDesc && <span className="block text-xs text-[#8A8A96] truncate">{m.desc}</span>}
                </span>
                {badge > 0 && (
                    <span className="min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center text-[#0B0B0D]" style={{ background: ACCENT.amber }}>{badge > 99 ? '99+' : badge}</span>
                )}
            </button>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-5 pt-6 pb-4">
                <a href="/" className="flex items-center gap-2.5" title="Open cratetv.net">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-black text-white" style={{ background: `linear-gradient(135deg, ${ACCENT.orange}, ${ACCENT.coral} 35%, ${ACCENT.magenta} 65%, ${ACCENT.violet})` }}>C</span>
                    <span>
                        <span className="block text-white font-black tracking-tight leading-none">CRATE Studio</span>
                        <span className="block text-[11px] text-[#8A8A96] mt-1">Admin</span>
                    </span>
                </a>
            </div>

            <div className="px-4 pb-3">
                <div className="relative">
                    <input
                        ref={searchRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && results[0]) go(results[0]);
                            if (e.key === 'Escape') { setQuery(''); (e.target as HTMLInputElement).blur(); }
                        }}
                        placeholder="Find anything…"
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-[#6A6A76] focus:outline-none focus:border-white/25"
                        aria-label="Search admin tools"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A76] text-sm" aria-hidden>⌕</span>
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#6A6A76] border border-white/10 rounded px-1.5 py-0.5">/</kbd>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5" aria-label="Admin sections">
                {query.trim() ? (
                    <div className="space-y-1">
                        {results.length ? results.map(id => renderItem(id, ACCENT.coral, true)) : <p className="px-3 py-4 text-sm text-[#8A8A96]">Nothing found for “{query}”.</p>}
                    </div>
                ) : TAB_GROUPS.map(group => {
                    const ids = group.ids.filter(id => allowedTabs.includes(id));
                    if (!ids.length) return null;
                    return (
                        <div key={group.title}>
                            <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] flex items-center gap-2" style={{ color: `${ACCENT[group.accent]}CC` }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT[group.accent] }} />{group.title}
                            </p>
                            <div className="space-y-0.5">{ids.map(id => renderItem(id, ACCENT[group.accent]))}</div>
                        </div>
                    );
                })}
            </nav>

            <div className="border-t border-white/[0.07] p-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">{(operatorName || 'A').charAt(0).toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{operatorName || 'Admin'}</p>
                    <p className="text-xs text-[#8A8A96] truncate">{jobTitle || 'Signed in'}</p>
                </div>
                <button onClick={onLogout} className="text-xs font-bold text-[#A1A1AD] hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5">Sign out</button>
            </div>
        </div>
    );
};

export default AdminSidebar;
