import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CRATE Studio — shared building blocks for the admin panel (Oct 2026 refresh).
// Plain-language labels, sentence case, the CRATE brand colours as accents.
// Colours are applied with inline styles so Tailwind never purges them.
// ─────────────────────────────────────────────────────────────────────────────

export const ACCENT = {
    coral: '#FF3B5C',
    orange: '#FF9A3C',
    amber: '#FFC53D',
    magenta: '#D63BD9',
    violet: '#7B4DFF',
    sky: '#3BB2FF',
    green: '#1FCB7A',
    gray: '#8A8A96',
} as const;
export type AccentName = keyof typeof ACCENT;

export const money = (cents: number | undefined | null, opts: { compact?: boolean } = {}) => {
    const v = (Number(cents) || 0) / 100;
    if (opts.compact && Math.abs(v) >= 10000) return `$${(v / 1000).toFixed(1)}k`;
    return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

export const shortDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const adminKey = () => sessionStorage.getItem('adminPassword') || '';

/** POST to an admin endpoint with the session pass. Throws with the server's message on failure. */
export async function adminPost<T = any>(url: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminKey(), ...body }),
    });
    let data: any = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data as T;
}

export const PageHeader: React.FC<{ title: string; subtitle?: string; accent?: AccentName; actions?: React.ReactNode }> = ({ title, subtitle, accent = 'coral', actions }) => (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
            <div className="h-1 w-12 rounded-full mb-4" style={{ background: ACCENT[accent] }} />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{title}</h1>
            {subtitle && <p className="text-[15px] text-[#A1A1AD] mt-2 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; accent?: AccentName; padded?: boolean }> = ({ children, className = '', accent, padded = true }) => (
    <div
        className={`relative rounded-3xl bg-[#131318] border border-white/[0.07] ${padded ? 'p-5 md:p-6' : ''} ${className}`}
        style={accent ? { boxShadow: `inset 0 1px 0 0 ${ACCENT[accent]}33` } : undefined}
    >
        {children}
    </div>
);

export const SectionTitle: React.FC<{ title: string; hint?: string; right?: React.ReactNode }> = ({ title, hint, right }) => (
    <div className="flex items-end justify-between gap-4 mb-4">
        <div>
            <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
            {hint && <p className="text-sm text-[#8A8A96] mt-0.5">{hint}</p>}
        </div>
        {right}
    </div>
);

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: AccentName; icon?: React.ReactNode; onClick?: () => void }> = ({ label, value, hint, accent = 'coral', icon, onClick }) => {
    const Tag: any = onClick ? 'button' : 'div';
    return (
        <Tag
            onClick={onClick}
            className={`text-left relative overflow-hidden rounded-3xl bg-[#131318] border border-white/[0.07] p-5 ${onClick ? 'hover:border-white/20 hover:-translate-y-0.5 transition-all' : ''}`}
        >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-25" style={{ background: ACCENT[accent] }} />
            <div className="relative flex items-center gap-2 text-[13px] font-semibold text-[#A1A1AD]">
                {icon && <span className="text-base" aria-hidden>{icon}</span>}
                {label}
            </div>
            <div className="relative text-2xl md:text-3xl font-black text-white mt-2 tracking-tight">{value}</div>
            {hint && <div className="relative text-xs text-[#8A8A96] mt-1">{hint}</div>}
        </Tag>
    );
};

export const Pill: React.FC<{ children: React.ReactNode; accent?: AccentName; solid?: boolean }> = ({ children, accent = 'gray', solid }) => (
    <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
        style={solid ? { background: ACCENT[accent], color: '#0B0B0D' } : { background: `${ACCENT[accent]}1F`, color: ACCENT[accent] }}
    >
        {children}
    </span>
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; accent?: AccentName; size?: 'sm' | 'md' };
export const Button: React.FC<BtnProps> = ({ variant = 'secondary', accent = 'coral', size = 'md', className = '', style, children, ...rest }) => {
    const sizing = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
    const base = `inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${sizing}`;
    if (variant === 'primary') {
        return <button {...rest} className={`${base} text-[#0B0B0D] hover:brightness-110 ${className}`} style={{ background: ACCENT[accent], ...style }}>{children}</button>;
    }
    if (variant === 'danger') {
        return <button {...rest} className={`${base} bg-[#FF3B5C]/10 text-[#FF6B85] hover:bg-[#FF3B5C]/20 ${className}`} style={style}>{children}</button>;
    }
    if (variant === 'ghost') {
        return <button {...rest} className={`${base} text-[#A1A1AD] hover:text-white hover:bg-white/5 ${className}`} style={style}>{children}</button>;
    }
    return <button {...rest} className={`${base} bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1] ${className}`} style={style}>{children}</button>;
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <label className="block">
        <span className="text-[13px] font-semibold text-[#C9C9D1]">{label}</span>
        <div className="mt-1.5">{children}</div>
        {hint && <span className="text-xs text-[#8A8A96] mt-1 block">{hint}</span>}
    </label>
);

export const inputClass = 'w-full bg-[#0B0B0D] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder:text-[#5A5A66] focus:border-white/30 focus:outline-none';

export const EmptyState: React.FC<{ icon?: string; title: string; text?: string; action?: React.ReactNode }> = ({ icon = '✨', title, text, action }) => (
    <div className="text-center py-12 px-6 rounded-3xl border border-dashed border-white/10">
        <div className="text-3xl mb-3" aria-hidden>{icon}</div>
        <p className="text-white font-bold">{title}</p>
        {text && <p className="text-sm text-[#8A8A96] mt-1 max-w-md mx-auto">{text}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6" onClick={onClose}>
        <div
            className={`w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-lg'} max-h-[92vh] overflow-y-auto bg-[#16161C] border border-white/10 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="flex items-start justify-between gap-4 mb-5">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <button onClick={onClose} className="text-[#8A8A96] hover:text-white text-2xl leading-none" aria-label="Close">×</button>
            </div>
            {children}
        </div>
    </div>
);

export const Notice: React.FC<{ tone?: 'info' | 'warn' | 'error' | 'success'; children: React.ReactNode }> = ({ tone = 'info', children }) => {
    const color = tone === 'warn' ? ACCENT.amber : tone === 'error' ? ACCENT.coral : tone === 'success' ? ACCENT.green : ACCENT.sky;
    return (
        <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: `${color}14`, border: `1px solid ${color}40`, color: '#E7E7EC' }}>
            {children}
        </div>
    );
};

/** A horizontal bar split into coloured parts — "where the money went". */
export const SplitBar: React.FC<{ parts: { label: string; value: number; accent: AccentName }[]; height?: number }> = ({ parts, height = 18 }) => {
    const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
    return (
        <div>
            <div className="flex w-full overflow-hidden rounded-full bg-white/5" style={{ height }}>
                {total > 0 && parts.filter(p => p.value > 0).map(p => (
                    <div key={p.label} title={`${p.label}: ${money(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: ACCENT[p.accent] }} />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                {parts.map(p => (
                    <div key={p.label} className="flex items-center gap-2 text-sm">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT[p.accent] }} />
                        <span className="text-[#A1A1AD]">{p.label}</span>
                        <span className="text-white font-bold">{money(p.value)}</span>
                        {total > 0 && <span className="text-[#5A5A66] text-xs">{Math.round((Math.max(0, p.value) / total) * 100)}%</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const copyText = async (text: string) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};
