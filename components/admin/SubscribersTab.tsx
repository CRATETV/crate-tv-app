import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Notice, PageHeader, StatTile, adminPost, copyText, inputClass, shortDate } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Subscribers — everyone on the Zine newsletter list.
// Data: /api/get-subscribers (the `zine_subscriptions` collection). Active
// subscribers are front and center; cancelled (unsubscribed) ones live in
// their own tab so the list you actually email doesn't get cluttered with
// people who opted out.
// ─────────────────────────────────────────────────────────────────────────────

interface Subscriber { email: string; status: 'active' | 'cancelled'; subscribedAt: string | null; cancelledAt: string | null }

const SubscribersTab: React.FC = () => {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState<'active' | 'cancelled'>('active');
    const [query, setQuery] = useState('');
    const [busyEmail, setBusyEmail] = useState('');
    const [toast, setToast] = useState('');
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const data = await adminPost<{ subscribers: Subscriber[] }>('/api/get-subscribers', { action: 'list' });
            setSubscribers(data.subscribers || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load subscribers.');
        } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const active = useMemo(() => subscribers.filter(s => s.status === 'active'), [subscribers]);
    const cancelled = useMemo(() => subscribers.filter(s => s.status === 'cancelled'), [subscribers]);
    const shown = useMemo(() => {
        const list = tab === 'active' ? active : cancelled;
        const q = query.trim().toLowerCase();
        return q ? list.filter(s => s.email.toLowerCase().includes(q)) : list;
    }, [tab, active, cancelled, query]);

    const setStatus = async (email: string, status: 'active' | 'cancelled') => {
        setBusyEmail(email);
        try {
            await adminPost('/api/get-subscribers', { action: 'set-status', email, status });
            setSubscribers(list => list.map(s => s.email === email ? { ...s, status, cancelledAt: status === 'cancelled' ? new Date().toISOString() : s.cancelledAt } : s));
            setToast(status === 'cancelled' ? `Moved ${email} to Cancelled` : `Reactivated ${email}`);
            setTimeout(() => setToast(''), 3000);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not update that subscriber.');
        } finally { setBusyEmail(''); }
    };

    const copyActiveEmails = async () => {
        if (await copyText(active.map(s => s.email).join(', '))) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    };

    if (loading && !subscribers.length) return <div className="py-24 text-center text-[#8A8A96]">Loading subscribers…</div>;

    return (
        <div className="space-y-8">
            <PageHeader
                title="Subscribers"
                subtitle="Everyone on the Zine newsletter list — who's in, and who's opted out."
                accent="magenta"
                actions={<Button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</Button>}
            />
            {toast && <Notice tone="success">{toast}</Notice>}
            {error && <Notice tone="error">{error} <button className="underline ml-2" onClick={load}>Try again</button></Notice>}

            <div className="grid grid-cols-2 gap-4">
                <StatTile label="Active subscribers" icon="📰" accent="green" value={active.length} />
                <StatTile label="Cancelled" icon="🚫" accent="gray" value={cancelled.length} />
            </div>

            <Card padded={false}>
                <div className="flex items-center justify-between gap-3 p-4 border-b border-white/[0.07]">
                    <div className="flex gap-1 p-1 bg-black/30 rounded-xl">
                        <button
                            onClick={() => setTab('active')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'active' ? 'bg-[#1FCB7A] text-[#0B0B0D]' : 'text-[#A1A1AD] hover:text-white'}`}
                        >
                            Active ({active.length})
                        </button>
                        <button
                            onClick={() => setTab('cancelled')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'cancelled' ? 'bg-white/15 text-white' : 'text-[#A1A1AD] hover:text-white'}`}
                        >
                            Cancelled ({cancelled.length})
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        {tab === 'active' && active.length > 0 && (
                            <Button size="sm" onClick={copyActiveEmails}>{copied ? 'Copied ✓' : 'Copy active emails'}</Button>
                        )}
                        <input
                            className={`${inputClass} w-48`}
                            placeholder="Search email…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {shown.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            icon={tab === 'active' ? '📰' : '🚫'}
                            title={query ? 'No match' : tab === 'active' ? 'No active subscribers yet' : 'Nobody has unsubscribed'}
                            text={query ? 'Try a different search.' : tab === 'active' ? 'People subscribe from the Zine page footer.' : "When someone unsubscribes, they'll show up here instead of on Active."}
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[#8A8A96] text-xs uppercase tracking-wide border-b border-white/[0.07]">
                                    <th className="px-4 py-3 font-semibold">Email</th>
                                    <th className="px-4 py-3 font-semibold">{tab === 'active' ? 'Subscribed' : 'Cancelled'}</th>
                                    <th className="px-4 py-3 font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map(s => (
                                    <tr key={s.email} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3 text-white font-medium">{s.email}</td>
                                        <td className="px-4 py-3 text-[#A1A1AD]">{shortDate(tab === 'active' ? s.subscribedAt : s.cancelledAt)}</td>
                                        <td className="px-4 py-3 text-right">
                                            {tab === 'active' ? (
                                                <Button size="sm" variant="ghost" disabled={busyEmail === s.email} onClick={() => setStatus(s.email, 'cancelled')}>
                                                    {busyEmail === s.email ? 'Working…' : 'Mark cancelled'}
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" disabled={busyEmail === s.email} onClick={() => setStatus(s.email, 'active')}>
                                                    {busyEmail === s.email ? 'Working…' : 'Reactivate'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <p className="text-xs text-[#5A5A66]">
                Only active subscribers are emailed from the Email tab's Dispatch and the monthly spotlight — cancelled addresses are skipped automatically.
            </p>
        </div>
    );
};

export default SubscribersTab;
