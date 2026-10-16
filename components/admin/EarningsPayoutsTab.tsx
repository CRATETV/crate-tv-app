import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ACCENT, AccentName, Button, Card, EmptyState, Field, Modal, Notice, PageHeader, Pill, SectionTitle, SplitBar, StatTile,
    adminPost, copyText, inputClass, money, shortDate,
} from './ui';
import { PAYOUT_METHOD_LABELS, PayoutMethod, payoutLink } from '../../api/_lib/revenueSplit';

// ─────────────────────────────────────────────────────────────────────────────
// Earnings & Payouts — every dollar, who it belongs to, and who CRATE owes.
// Data: /api/admin-earnings (summary). Money is never moved from here: you
// send it with PayPal / Cash App / Venmo / Zelle, then record it, which
// lowers the filmmaker's balance on their dashboard.
// ─────────────────────────────────────────────────────────────────────────────

interface FilmRow {
    key: string; title: string; poster: string; director: string; producers: string;
    revenue: { donations: number; tickets: number; rentals: number; total: number };
    filmmakerPercent: number; customDeal: boolean; deal: { filmmakerShare?: number; payees?: { name: string; share: number }[]; notes?: string } | null;
    filmmakerAmount: number; crateAmount: number;
    payees: { name: string; percentOfFilmmakerSide: number; amount: number }[];
}
interface PayeeRow {
    key: string; name: string; filmEarnings: number; shopEarnings: number; earned: number; paidOut: number; balance: number;
    films: string[]; lastPaidAt: string | null; pendingRequestId: string | null;
    pref: { method?: PayoutMethod; handle?: string; email?: string; notes?: string; w9OnFile?: boolean; updatedBy?: string } | null;
}
interface Summary {
    generatedAt: string; squareConnected: boolean; minimumPayoutCents: number;
    totals: { gross: number; fees: number; filmGross: number; filmmakerShare: number; crateFromFilms: number; festival: number; partner: number; heldDuringFestival: number; crateOnly: number; shopFilmmaker: number; crateKeeps: number; owedNow: number; paidOutAllTime: number };
    months: { month: string; gross: number; filmmakers: number; crate: number; festival: number; partner: number; fees: number }[];
    films: FilmRow[];
    payees: PayeeRow[];
    pendingRequests: { id: string; name: string; email: string; amount: number; requestedAt: string | null; filmTitles: string[]; payoutMethod: string; payoutDetails: string }[];
    history: { id: string; name: string; amount: number; method: string; reference: string; completedAt: string | null; recordedBy: string }[];
}

const METHOD_LIST = Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethod[];
const methodLabel = (m?: string) => (m && (PAYOUT_METHOD_LABELS as any)[m]) || (m ? m : 'Not set');

// ── Month chart ─────────────────────────────────────────────────────────────
const MonthChart: React.FC<{ months: Summary['months'] }> = ({ months }) => {
    const series: { key: 'filmmakers' | 'crate' | 'festival' | 'partner'; label: string; accent: AccentName }[] = [
        { key: 'filmmakers', label: 'Filmmakers', accent: 'green' },
        { key: 'crate', label: 'CRATE', accent: 'coral' },
        { key: 'festival', label: 'Festival tickets', accent: 'violet' },
        { key: 'partner', label: 'Partner festivals', accent: 'sky' },
    ];
    const [hover, setHover] = useState<number | null>(null);
    if (!months.length) return <EmptyState icon="📈" title="No sales yet" text="Once payments come in, you'll see each month here." />;
    const max = Math.max(1, ...months.map(m => series.reduce((s, x) => s + m[x.key], 0)));
    const W = 720, H = 220, padL = 52, padB = 28, padT = 10;
    const bw = (W - padL - 8) / months.length;
    const y = (v: number) => H - padB - (v / max) * (H - padB - padT);
    const ticks = [0, 0.5, 1].map(f => Math.round(max * f));
    const label = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'short' });
    return (
        <div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Revenue by month, split by who it belongs to">
                {ticks.map(t => (
                    <g key={t}>
                        <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.07)" />
                        <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8A8A96">{money(t, { compact: true }).replace('.00', '')}</text>
                    </g>
                ))}
                {months.map((m, i) => {
                    let acc = 0;
                    const x = padL + i * bw + bw * 0.18;
                    const w = bw * 0.64;
                    return (
                        <g key={m.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                            <rect x={padL + i * bw} y={padT} width={bw} height={H - padB - padT} fill={hover === i ? 'rgba(255,255,255,0.04)' : 'transparent'} />
                            {series.map(s => {
                                const v = m[s.key];
                                if (v <= 0) return null;
                                const top = y(acc + v), bottom = y(acc);
                                acc += v;
                                return <rect key={s.key} x={x} y={top} width={w} height={Math.max(1, bottom - top)} rx={3} fill={ACCENT[s.accent]} />;
                            })}
                            <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#8A8A96">{label(m.month)}</text>
                        </g>
                    );
                })}
            </svg>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 text-sm min-h-[24px]">
                {hover === null ? series.map(s => (
                    <span key={s.key} className="flex items-center gap-2 text-[#A1A1AD]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT[s.accent] }} />{s.label}</span>
                )) : (
                    <>
                        <span className="text-white font-bold">{new Date(`${months[hover].month}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        {series.map(s => <span key={s.key} className="text-[#A1A1AD]">{s.label} <span className="text-white font-semibold">{money(months[hover][s.key])}</span></span>)}
                    </>
                )}
            </div>
        </div>
    );
};

// ── Pay dialog ──────────────────────────────────────────────────────────────
const PayDialog: React.FC<{ payee: PayeeRow; request?: Summary['pendingRequests'][number]; onClose: () => void; onDone: () => void }> = ({ payee, request, onClose, onDone }) => {
    const [amount, setAmount] = useState(((request?.amount || payee.balance) / 100).toFixed(2));
    const [method, setMethod] = useState<PayoutMethod>(payee.pref?.method || 'paypal');
    const [handle, setHandle] = useState(payee.pref?.handle || '');
    const [reference, setReference] = useState('');
    const [notify, setNotify] = useState(!!(payee.pref?.email || request?.email));
    const [email, setEmail] = useState(payee.pref?.email || request?.email || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState('');
    const cents = Math.round((parseFloat(amount) || 0) * 100);
    const link = payoutLink(method, handle, cents, `CRATE TV payout – ${payee.films.slice(0, 2).join(', ')}`);

    const record = async () => {
        setSaving(true); setError('');
        try {
            if (handle !== (payee.pref?.handle || '') || method !== payee.pref?.method) {
                await adminPost('/api/admin-earnings', { action: 'set-payee', name: payee.name, method, handle, email, notes: payee.pref?.notes || '', w9OnFile: !!payee.pref?.w9OnFile });
            }
            await adminPost('/api/admin-earnings', {
                action: 'record-payout', name: payee.name, amountCents: cents, method, reference,
                requestId: request?.id || '', notify, notifyEmail: email,
            });
            onDone();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not record the payout.');
        } finally { setSaving(false); }
    };

    return (
        <Modal title={`Pay ${payee.name}`} onClose={onClose}>
            <div className="space-y-5">
                <div className="rounded-2xl bg-[#1FCB7A]/10 border border-[#1FCB7A]/30 p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-[#A1A1AD]">Owed now</p>
                        <p className="text-2xl font-black text-white">{money(payee.balance)}</p>
                    </div>
                    {request && <Pill accent="amber">They requested {money(request.amount)}</Pill>}
                </div>
                {request?.payoutDetails && <Notice>Their request says: <span className="text-white">{request.payoutMethod} {request.payoutDetails}</span></Notice>}

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Amount (USD)">
                        <input className={inputClass} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                    </Field>
                    <Field label="Method">
                        <select className={inputClass} value={method} onChange={e => setMethod(e.target.value as PayoutMethod)}>
                            {METHOD_LIST.map(m => <option key={m} value={m}>{PAYOUT_METHOD_LABELS[m]}</option>)}
                        </select>
                    </Field>
                </div>
                <Field label={method === 'zelle' ? 'Their Zelle email or phone' : method === 'check' ? 'Mailing address / bank notes' : 'Their username or link'}
                    hint={payee.pref?.updatedBy === 'filmmaker' ? 'Set by the filmmaker on their dashboard.' : undefined}>
                    <input className={inputClass} value={handle} onChange={e => setHandle(e.target.value)} placeholder={method === 'paypal' ? 'paypal.me/name' : method === 'cashapp' ? '$cashtag' : method === 'venmo' ? '@username' : ''} />
                </Field>

                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <p className="text-sm font-bold text-white">Step 1 — send the money</p>
                    {link ? (
                        <a href={link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full rounded-xl py-3 font-black text-[#0B0B0D]" style={{ background: ACCENT.green }}>
                            Open {PAYOUT_METHOD_LABELS[method]} with {money(cents)} filled in ↗
                        </a>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" disabled={!handle} onClick={async () => { if (await copyText(handle)) setCopied('handle'); }}>{copied === 'handle' ? 'Copied ✓' : 'Copy their details'}</Button>
                            <Button size="sm" onClick={async () => { if (await copyText((cents / 100).toFixed(2))) setCopied('amount'); }}>{copied === 'amount' ? 'Copied ✓' : `Copy ${money(cents)}`}</Button>
                            <p className="text-xs text-[#8A8A96] w-full">{PAYOUT_METHOD_LABELS[method]} can't be pre-filled from a link. Send it in your banking or payment app, then record it below.</p>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <p className="text-sm font-bold text-white">Step 2 — record it</p>
                    <Field label="Reference (optional)" hint="Transaction ID or a note, so you can match it later.">
                        <input className={inputClass} value={reference} onChange={e => setReference(e.target.value)} />
                    </Field>
                    <label className="flex items-center gap-3 text-sm text-[#C9C9D1]">
                        <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4" />
                        Email them a payout receipt
                    </label>
                    {notify && <input className={inputClass} type="email" placeholder="their email" value={email} onChange={e => setEmail(e.target.value)} />}
                </div>

                {cents > payee.balance && <Notice tone="warn">This is more than their balance of {money(payee.balance)}. You can still record it (for example, an advance).</Notice>}
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" accent="green" disabled={saving || cents <= 0} onClick={record}>{saving ? 'Saving…' : `I sent ${money(cents)} — record payout`}</Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Payee settings dialog ───────────────────────────────────────────────────
const PayeeDialog: React.FC<{ payee: PayeeRow; onClose: () => void; onDone: () => void }> = ({ payee, onClose, onDone }) => {
    const [method, setMethod] = useState<PayoutMethod>(payee.pref?.method || 'paypal');
    const [handle, setHandle] = useState(payee.pref?.handle || '');
    const [email, setEmail] = useState(payee.pref?.email || '');
    const [notes, setNotes] = useState(payee.pref?.notes || '');
    const [w9, setW9] = useState(!!payee.pref?.w9OnFile);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const save = async () => {
        setSaving(true); setError('');
        try {
            await adminPost('/api/admin-earnings', { action: 'set-payee', name: payee.name, method, handle, email, notes, w9OnFile: w9 });
            onDone();
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); } finally { setSaving(false); }
    };
    return (
        <Modal title={`How to pay ${payee.name}`} onClose={onClose}>
            <div className="space-y-4">
                <Field label="Method">
                    <select className={inputClass} value={method} onChange={e => setMethod(e.target.value as PayoutMethod)}>
                        {METHOD_LIST.map(m => <option key={m} value={m}>{PAYOUT_METHOD_LABELS[m]}</option>)}
                    </select>
                </Field>
                <Field label="Username, $cashtag, email or phone"><input className={inputClass} value={handle} onChange={e => setHandle(e.target.value)} /></Field>
                <Field label="Email for receipts"><input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                <Field label="Private notes"><textarea className={inputClass} rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></Field>
                <label className="flex items-center gap-3 text-sm text-[#C9C9D1]">
                    <input type="checkbox" checked={w9} onChange={e => setW9(e.target.checked)} className="w-4 h-4" />
                    W-9 received (keep the form itself in Contracts → Uploaded documents)
                </label>
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
                </div>
            </div>
        </Modal>
    );
};

// ── Split dialog ────────────────────────────────────────────────────────────
const SplitDialog: React.FC<{ film: FilmRow; onClose: () => void; onDone: () => void }> = ({ film, onClose, onDone }) => {
    const credited = useMemo(() => [...film.director.split(','), ...film.producers.split(',')].map(s => s.trim()).filter(Boolean), [film]);
    const [percent, setPercent] = useState(String(film.filmmakerPercent));
    const [custom, setCustom] = useState(!!film.deal?.payees?.length);
    const [payees, setPayees] = useState<{ name: string; share: string }[]>(
        film.deal?.payees?.length ? film.deal.payees.map(p => ({ name: p.name, share: String(p.share) })) : (credited.length ? credited : ['']).map(n => ({ name: n, share: String(Math.round(100 / Math.max(1, credited.length))) })),
    );
    const [notes, setNotes] = useState(film.deal?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const p = Math.min(100, Math.max(0, parseFloat(percent) || 0));
    const shareTotal = payees.reduce((s, x) => s + (parseFloat(x.share) || 0), 0);

    const save = async (clear = false) => {
        setSaving(true); setError('');
        try {
            if (clear) await adminPost('/api/admin-earnings', { action: 'clear-deal', movieKey: film.key });
            else await adminPost('/api/admin-earnings', {
                action: 'set-deal', movieKey: film.key, filmmakerPercent: p, notes,
                payees: custom ? payees.map(x => ({ name: x.name, share: parseFloat(x.share) || 0 })) : [],
            });
            onDone();
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); } finally { setSaving(false); }
    };

    return (
        <Modal title={`Split for “${film.title}”`} onClose={onClose} wide>
            <div className="space-y-6">
                <div>
                    <div className="flex items-end justify-between mb-3">
                        <Field label="Filmmaker share (%)">
                            <input className={`${inputClass} w-28`} inputMode="decimal" value={percent} onChange={e => setPercent(e.target.value.replace(/[^0-9.]/g, ''))} />
                        </Field>
                        <div className="flex gap-2">
                            {[70, 80, 90].map(v => <Button key={v} size="sm" onClick={() => setPercent(String(v))}>{v}/{100 - v}</Button>)}
                        </div>
                    </div>
                    <SplitBar parts={[
                        { label: 'Filmmaker side', value: Math.round(film.revenue.total * p / 100), accent: 'green' },
                        { label: 'CRATE', value: film.revenue.total - Math.round(film.revenue.total * p / 100), accent: 'coral' },
                    ]} />
                    <p className="text-xs text-[#8A8A96] mt-2">Shown on this film's revenue so far ({money(film.revenue.total)}). The new split applies to all of its revenue, past and future, minus anything already paid.</p>
                </div>

                <div>
                    <label className="flex items-center gap-3 text-sm text-white font-semibold">
                        <input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} className="w-4 h-4" />
                        Choose exactly who gets paid
                    </label>
                    {!custom && (
                        <p className="text-sm text-[#8A8A96] mt-2">
                            The filmmaker side is shared equally by everyone credited: {credited.length ? credited.join(', ') : <span className="text-[#FFC53D]">nobody is credited yet — add a director in Films</span>}.
                        </p>
                    )}
                    {custom && (
                        <div className="mt-3 space-y-2">
                            {payees.map((x, i) => (
                                <div key={i} className="flex gap-2">
                                    <input className={inputClass} placeholder="Name (exactly as on their filmmaker account)" value={x.name} onChange={e => setPayees(ps => ps.map((q, j) => j === i ? { ...q, name: e.target.value } : q))} />
                                    <input className={`${inputClass} w-24`} placeholder="Share" inputMode="decimal" value={x.share} onChange={e => setPayees(ps => ps.map((q, j) => j === i ? { ...q, share: e.target.value.replace(/[^0-9.]/g, '') } : q))} />
                                    <Button variant="ghost" onClick={() => setPayees(ps => ps.filter((_, j) => j !== i))} aria-label="Remove">×</Button>
                                </div>
                            ))}
                            <div className="flex items-center justify-between">
                                <Button size="sm" onClick={() => setPayees(ps => [...ps, { name: '', share: '' }])}>+ Add person</Button>
                                <span className="text-xs text-[#8A8A96]">Shares are relative — {shareTotal ? payees.map(x => `${x.name || '?'} ${Math.round(((parseFloat(x.share) || 0) / shareTotal) * 100)}%`).join(' · ') : 'add shares'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <Field label="Deal notes (private)" hint="For example: “80/20 for festival winners, agreed by email 3 Oct”.">
                    <textarea className={inputClass} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                </Field>
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex flex-wrap justify-between gap-2">
                    {film.customDeal ? <Button variant="danger" disabled={saving} onClick={() => save(true)}>Reset to 70/30</Button> : <span />}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" disabled={saving} onClick={() => save(false)}>{saving ? 'Saving…' : 'Save split'}</Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// ── Page ────────────────────────────────────────────────────────────────────
const EarningsPayoutsTab: React.FC<{ onOpenTab?: (id: string) => void }> = ({ onOpenTab }) => {
    const [data, setData] = useState<Summary | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState<{ payee: PayeeRow; request?: Summary['pendingRequests'][number] } | null>(null);
    const [editingPayee, setEditingPayee] = useState<PayeeRow | null>(null);
    const [editingFilm, setEditingFilm] = useState<FilmRow | null>(null);
    const [filmQuery, setFilmQuery] = useState('');
    const [showAllFilms, setShowAllFilms] = useState(false);
    const [toast, setToast] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try { setData(await adminPost<Summary>('/api/admin-earnings', { action: 'summary' })); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not load earnings.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const done = (msg: string) => { setPaying(null); setEditingPayee(null); setEditingFilm(null); setToast(msg); setTimeout(() => setToast(''), 4000); load(); };

    const owed = useMemo(() => (data?.payees || []).filter(p => p.balance > 0), [data]);
    const films = useMemo(() => {
        const q = filmQuery.trim().toLowerCase();
        const list = (data?.films || []).filter(f => !q || f.title.toLowerCase().includes(q) || f.director.toLowerCase().includes(q));
        return showAllFilms || q ? list : list.filter(f => f.revenue.total > 0 || f.customDeal);
    }, [data, filmQuery, showAllFilms]);

    if (loading && !data) return <div className="py-24 text-center text-[#8A8A96]">Adding up every sale…</div>;
    if (error && !data) return <Notice tone="error">{error} <button className="underline ml-2" onClick={load}>Try again</button></Notice>;
    if (!data) return null;
    const t = data.totals;

    return (
        <div className="space-y-10">
            <PageHeader
                title="Earnings & Payouts"
                subtitle="Every dollar CRATE has taken in, who it belongs to, and who you owe right now."
                accent="green"
                actions={<Button onClick={load} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</Button>}
            />
            {toast && <Notice tone="success">{toast}</Notice>}
            {!data.squareConnected && <Notice tone="warn">Square isn't connected in this environment, so sales show as $0. On the live site this fills in automatically.</Notice>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Total revenue" icon="💵" accent="sky" value={money(t.gross)} hint={`Since May 2025 · Square fees ${money(t.fees)}`} />
                <StatTile label="Earned by filmmakers" icon="🎬" accent="green" value={money(t.filmmakerShare + t.shopFilmmaker)} hint={`${money(t.paidOutAllTime)} paid out so far`} />
                <StatTile label="CRATE keeps" icon="🏠" accent="coral" value={money(t.crateKeeps)} hint="Your share of films + passes & subscriptions" />
                <StatTile label="You owe right now" icon="⏳" accent="amber" value={money(t.owedNow)} hint={`${owed.length} ${owed.length === 1 ? 'person' : 'people'}${data.pendingRequests.length ? ` · ${data.pendingRequests.length} asked to be paid` : ''}`} />
            </div>

            <Card>
                <SectionTitle title="Where the money went" hint="All revenue since May 2025, by who it belongs to." />
                <SplitBar height={22} parts={[
                    { label: 'Filmmakers', value: t.filmmakerShare, accent: 'green' },
                    { label: 'CRATE (film share)', value: t.crateFromFilms, accent: 'coral' },
                    { label: 'CRATE (passes, subscriptions, other)', value: t.crateOnly + t.heldDuringFestival, accent: 'orange' },
                    { label: 'Festival tickets & passes', value: t.festival, accent: 'violet' },
                    { label: 'Partner festivals', value: t.partner, accent: 'sky' },
                ]} />
                <div className="grid md:grid-cols-3 gap-3 mt-6 text-sm">
                    <div className="rounded-2xl bg-white/[0.03] p-4"><p className="font-bold text-white">Film money</p><p className="text-[#A1A1AD] mt-1">Rentals, watch party tickets and tips. Split per film — {money(t.filmGross)} so far.</p></div>
                    <div className="rounded-2xl bg-white/[0.03] p-4"><p className="font-bold text-white">Festival money</p><p className="text-[#A1A1AD] mt-1">PWFF passes and blocks are settled under the festival agreement, not the film split.</p></div>
                    <div className="rounded-2xl bg-white/[0.03] p-4"><p className="font-bold text-white">Held during festivals</p><p className="text-[#A1A1AD] mt-1">{money(t.heldDuringFestival)} — festival-film rentals bought while the festival ran stay with CRATE.</p></div>
                </div>
            </Card>

            <Card>
                <SectionTitle title="Month by month" hint="The last 12 months. Hover a month for the numbers." />
                <MonthChart months={data.months} />
            </Card>

            <section>
                <SectionTitle title="Who you owe" hint={`Anyone with money waiting. Filmmakers can request a payout once they pass ${money(data.minimumPayoutCents)}, but you can pay any time.`} />
                {owed.length === 0 ? (
                    <EmptyState icon="🎉" title="You're all paid up" text="Nobody is owed anything right now." />
                ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {owed.map(p => {
                            const req = data.pendingRequests.find(r => r.id === p.pendingRequestId);
                            return (
                                <Card key={p.key} accent={req ? 'amber' : undefined}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold truncate">{p.name}</p>
                                            <p className="text-xs text-[#8A8A96] truncate">{p.films.join(', ') || 'Shop earnings'}</p>
                                        </div>
                                        {req ? <Pill accent="amber">Requested</Pill> : p.balance >= data.minimumPayoutCents ? <Pill accent="green">Ready</Pill> : <Pill>Under {money(data.minimumPayoutCents)}</Pill>}
                                    </div>
                                    <p className="text-3xl font-black text-white mt-4">{money(p.balance)}</p>
                                    <p className="text-xs text-[#8A8A96] mt-1">Earned {money(p.earned)} · paid {money(p.paidOut)}{p.lastPaidAt ? ` · last ${shortDate(p.lastPaidAt)}` : ''}</p>
                                    <div className="flex items-center gap-2 mt-4 text-xs">
                                        <span className="text-[#8A8A96]">Pay by</span>
                                        {p.pref?.method ? <Pill accent="sky">{methodLabel(p.pref.method)}{p.pref.handle ? ` · ${p.pref.handle}` : ''}</Pill> : <Pill accent="amber">Not set</Pill>}
                                        {p.pref?.w9OnFile && <Pill accent="green">W-9 ✓</Pill>}
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="primary" accent="green" className="flex-1" onClick={() => setPaying({ payee: p, request: req })}>Pay {money(req?.amount || p.balance)}</Button>
                                        <Button onClick={() => setEditingPayee(p)}>Details</Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
                {data.pendingRequests.some(r => !owed.find(p => p.pendingRequestId === r.id)) && (
                    <div className="mt-4"><Notice tone="warn">Some payout requests don't match anyone with a balance (often a name spelled differently from the film credits). Check them in “More tools” below.</Notice></div>
                )}
            </section>

            <section>
                <SectionTitle
                    title="Films"
                    hint="What each film has made and how it's split. Click a film to change its split."
                    right={<div className="flex gap-2">
                        <input className={`${inputClass} w-48`} placeholder="Search films…" value={filmQuery} onChange={e => setFilmQuery(e.target.value)} />
                        <Button size="sm" variant="ghost" onClick={() => setShowAllFilms(v => !v)}>{showAllFilms ? 'Earning films only' : 'Show all films'}</Button>
                    </div>}
                />
                <Card padded={false} className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[#8A8A96] border-b border-white/[0.07]">
                                    <th className="px-5 py-3 font-semibold">Film</th>
                                    <th className="px-3 py-3 font-semibold text-right">Revenue</th>
                                    <th className="px-3 py-3 font-semibold">Split</th>
                                    <th className="px-3 py-3 font-semibold text-right">Filmmakers</th>
                                    <th className="px-3 py-3 font-semibold text-right">CRATE</th>
                                    <th className="px-5 py-3 font-semibold">Paid to</th>
                                </tr>
                            </thead>
                            <tbody>
                                {films.map(f => (
                                    <tr key={f.key} onClick={() => setEditingFilm(f)} className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {f.poster ? <img src={f.poster} alt="" className="w-8 h-11 rounded object-cover bg-white/5" loading="lazy" /> : <div className="w-8 h-11 rounded bg-white/5" />}
                                                <div className="min-w-0">
                                                    <p className="text-white font-semibold truncate max-w-[220px]">{f.title}</p>
                                                    <p className="text-xs text-[#8A8A96]">{[f.revenue.rentals && `Rentals ${money(f.revenue.rentals)}`, f.revenue.tickets && `Tickets ${money(f.revenue.tickets)}`, f.revenue.donations && `Tips ${money(f.revenue.donations)}`].filter(Boolean).join(' · ') || 'No sales yet'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right text-white font-semibold">{money(f.revenue.total)}</td>
                                        <td className="px-3 py-3">{f.customDeal ? <Pill accent="violet">{f.filmmakerPercent}/{Math.round((100 - f.filmmakerPercent) * 100) / 100}</Pill> : <Pill>70/30</Pill>}</td>
                                        <td className="px-3 py-3 text-right" style={{ color: ACCENT.green }}>{money(f.filmmakerAmount)}</td>
                                        <td className="px-3 py-3 text-right" style={{ color: ACCENT.coral }}>{money(f.crateAmount)}</td>
                                        <td className="px-5 py-3 text-[#A1A1AD] text-xs">{f.payees.length ? f.payees.map(p => `${p.name}${f.payees.length > 1 ? ` (${p.percentOfFilmmakerSide}%)` : ''}`).join(', ') : <span style={{ color: ACCENT.amber }}>No credited filmmaker</span>}</td>
                                    </tr>
                                ))}
                                {films.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-[#8A8A96]">No films match.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </section>

            <section>
                <SectionTitle title="Payout history" hint="Every payout you've sent, newest first." />
                <Card padded={false} className="overflow-hidden">
                    {data.history.length === 0 ? <div className="p-6"><EmptyState icon="🧾" title="No payouts yet" /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-[#8A8A96] border-b border-white/[0.07]"><th className="px-5 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Paid to</th><th className="px-3 py-3 font-semibold text-right">Amount</th><th className="px-3 py-3 font-semibold">Method</th><th className="px-5 py-3 font-semibold">Reference</th></tr></thead>
                                <tbody>
                                    {data.history.map(h => (
                                        <tr key={h.id} className="border-b border-white/[0.04]">
                                            <td className="px-5 py-3 text-[#A1A1AD]">{shortDate(h.completedAt)}</td>
                                            <td className="px-3 py-3 text-white font-semibold">{h.name}</td>
                                            <td className="px-3 py-3 text-right text-white">{money(h.amount)}</td>
                                            <td className="px-3 py-3 text-[#A1A1AD]">{methodLabel(h.method)}</td>
                                            <td className="px-5 py-3 text-[#8A8A96] text-xs">{h.reference || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </section>

            {onOpenTab && (
                <p className="text-sm text-[#8A8A96]">Need the signed agreement behind a split? <button className="underline text-white" onClick={() => onOpenTab('contracts')}>Open Contracts</button>.</p>
            )}

            {paying && <PayDialog payee={paying.payee} request={paying.request} onClose={() => setPaying(null)} onDone={() => done(`Payout to ${paying.payee.name} recorded.`)} />}
            {editingPayee && <PayeeDialog payee={editingPayee} onClose={() => setEditingPayee(null)} onDone={() => done(`Saved payout details for ${editingPayee.name}.`)} />}
            {editingFilm && <SplitDialog film={editingFilm} onClose={() => setEditingFilm(null)} onDone={() => done(`Split for “${editingFilm.title}” saved.`)} />}
        </div>
    );
};

export default EarningsPayoutsTab;
