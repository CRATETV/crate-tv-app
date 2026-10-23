import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, Field, Modal, Notice, PageHeader, Pill, SectionTitle, StatTile, adminPost, inputClass, money } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Payments & refunds. Every Square payment, matched to the customer when CRATE
// knows them; likely double charges flagged at the top; refund in two clicks.
// Data: /api/admin-payments. Square is the source of truth — refunds can also
// still be done in the Square dashboard and show up here either way.
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentRow {
    id: string; createdAt: string; status: string; amount: number; refunded: number; refundable: number;
    note: string; partner: string | null; cardBrand: string; cardLast4: string; receiptUrl: string;
    email: string | null; ticketId: string | null; ticketRefunded: boolean; duplicateOf: string | null;
}
interface RefundRow { id: string; paymentId: string; amount: number; reason: string; email: string | null; status: string; createdAt: string | null; note: string }

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const newNonce = () => (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const RefundDialog: React.FC<{ payment: PaymentRow; isDuplicate: boolean; onClose: () => void; onDone: (msg: string) => void }> = ({ payment, isDuplicate, onClose, onDone }) => {
    const [amount, setAmount] = useState((payment.refundable / 100).toFixed(2));
    const [reason, setReason] = useState(isDuplicate ? 'Charged twice by mistake' : '');
    const [cancel, setCancel] = useState(false);
    const [notify, setNotify] = useState(!!payment.email);
    const [email, setEmail] = useState(payment.email || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [nonce] = useState(newNonce); // one per dialog: a double-click can't refund twice
    const cents = Math.round((parseFloat(amount) || 0) * 100);

    const send = async () => {
        if (!confirm(`Refund ${money(cents)} to the ${payment.cardBrand || 'card'}${payment.cardLast4 ? ` ending ${payment.cardLast4}` : ''}? This can't be undone.`)) return;
        setBusy(true); setError('');
        try {
            await adminPost('/api/admin-payments', {
                action: 'refund', paymentId: payment.id, amountCents: cents, reason, nonce,
                ticketId: payment.ticketId || '', email, notify, markTicketRefunded: cancel,
            });
            onDone(`Refunded ${money(cents)}${payment.email ? ` to ${payment.email}` : ''}. It usually reaches their card in 5–10 business days.`);
        } catch (e) { setError(e instanceof Error ? e.message : 'The refund did not go through.'); }
        finally { setBusy(false); }
    };

    return (
        <Modal title="Refund a payment" onClose={onClose}>
            <div className="space-y-4">
                <div className="rounded-2xl bg-white/[0.04] p-4 text-sm">
                    <p className="text-white font-bold">{payment.note || 'Payment'}</p>
                    <p className="text-[#A1A1AD] mt-1">{money(payment.amount)} · {when(payment.createdAt)} · {payment.cardBrand} {payment.cardLast4 && `•••• ${payment.cardLast4}`}</p>
                    {payment.email && <p className="text-[#A1A1AD]">{payment.email}</p>}
                    {payment.refunded > 0 && <p className="text-[#FFC53D] mt-1">{money(payment.refunded)} already refunded</p>}
                </div>
                {isDuplicate && <Notice tone="warn">This looks like a second charge for the same thing. Refunding it in full fixes the double charge. They keep the access they paid for once.</Notice>}
                <Field label="Amount to refund (USD)" hint={`Up to ${money(payment.refundable)}.`}>
                    <input className={inputClass} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
                </Field>
                <Field label="Reason" hint="Shown in your records and in Square.">
                    <input className={inputClass} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Charged twice, film wouldn't play" />
                </Field>
                {!isDuplicate && payment.ticketId && (
                    <label className="flex items-start gap-3 text-sm text-[#C9C9D1]">
                        <input type="checkbox" checked={cancel} onChange={e => setCancel(e.target.checked)} className="w-4 h-4 mt-0.5" />
                        <span>This is a cancellation. Mark their ticket as refunded, so the help desk won't restore it. Their current access isn't removed automatically; do that in Audience → Account lookup if needed.</span>
                    </label>
                )}
                <label className="flex items-center gap-3 text-sm text-[#C9C9D1]">
                    <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="w-4 h-4" />
                    Email the customer that the refund is on its way
                </label>
                {notify && <input className={inputClass} type="email" placeholder="their email" value={email} onChange={e => setEmail(e.target.value)} />}
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" accent="coral" disabled={busy || cents <= 0 || cents > payment.refundable} onClick={send}>{busy ? 'Refunding…' : `Refund ${money(cents)}`}</Button>
                </div>
            </div>
        </Modal>
    );
};

const PaymentsRefundsTab: React.FC = () => {
    const [days, setDays] = useState(60);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [refunds, setRefunds] = useState<RefundRow[]>([]);
    const [connected, setConnected] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [refunding, setRefunding] = useState<{ p: PaymentRow; dup: boolean } | null>(null);
    const [toast, setToast] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const r = await adminPost<{ squareConnected: boolean; payments: PaymentRow[]; refunds: RefundRow[] }>('/api/admin-payments', { action: 'list', days });
            setConnected(r.squareConnected); setPayments(r.payments || []); setRefunds(r.refunds || []);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load payments.'); }
        finally { setLoading(false); }
    }, [days]);
    useEffect(() => { load(); }, [load]);

    const byId = useMemo(() => new Map(payments.map(p => [p.id, p])), [payments]);
    const dupes = payments.filter(p => p.duplicateOf && p.refundable > 0);
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return payments;
        return payments.filter(p => `${p.email || ''} ${p.note} ${p.cardLast4} ${p.id} ${(p.amount / 100).toFixed(2)}`.toLowerCase().includes(q));
    }, [payments, query]);
    const total = payments.reduce((s, p) => s + p.amount, 0);
    const refundedTotal = payments.reduce((s, p) => s + p.refunded, 0);

    return (
        <div className="space-y-10">
            <PageHeader
                title="Payments & refunds"
                subtitle="Every payment from Square, who made it, and a two-click refund when something goes wrong, like a double charge."
                accent="coral"
                actions={<>
                    <select className={`${inputClass} w-40`} value={days} onChange={e => setDays(Number(e.target.value))} aria-label="How far back">
                        <option value={30}>Last 30 days</option><option value={60}>Last 60 days</option><option value={180}>Last 6 months</option><option value={365}>Last year</option>
                    </select>
                    <Button onClick={load} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</Button>
                </>}
            />
            {toast && <Notice tone="success">{toast}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
            {!connected && <Notice tone="warn">Square isn't connected in this environment, so no payments are shown. On the live site this fills in automatically.</Notice>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Payments" icon="💳" accent="sky" value={payments.length} hint={`Last ${days} days`} />
                <StatTile label="Taken in" icon="💵" accent="green" value={money(total)} />
                <StatTile label="Refunded" icon="↩️" accent="gray" value={money(refundedTotal)} />
                <StatTile label="Possible double charges" icon="⚠️" accent="amber" value={dupes.length} />
            </div>

            <section>
                <SectionTitle title="Possible double charges" hint="Same person, same item, same amount, a few minutes apart. The first charge is kept; these are the extras." />
                {loading ? <p className="text-[#8A8A96]">Checking…</p> : dupes.length === 0 ? (
                    <EmptyState icon="✅" title="No double charges found" text={`Nothing in the last ${days} days looks like a duplicate.`} />
                ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                        {dupes.map(p => {
                            const first = byId.get(p.duplicateOf!);
                            return (
                                <Card key={p.id} accent="amber">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold truncate">{p.note || 'Payment'}</p>
                                            <p className="text-xs text-[#8A8A96] truncate">{p.email || (p.cardLast4 ? `Card •••• ${p.cardLast4}` : 'Unknown buyer')}</p>
                                        </div>
                                        <Pill accent="amber">{money(p.amount)} twice</Pill>
                                    </div>
                                    <p className="text-sm text-[#A1A1AD] mt-3">First charge {when(first?.createdAt)} · extra charge {when(p.createdAt)}</p>
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="primary" accent="coral" className="flex-1" onClick={() => setRefunding({ p, dup: true })}>Refund the extra {money(p.refundable)}</Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            <section>
                <SectionTitle title="All payments" hint="Search by email, film or ticket name, card's last 4 digits, or amount."
                    right={<input className={`${inputClass} w-64`} placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />} />
                <Card padded={false} className="overflow-hidden">
                    {loading ? <p className="p-6 text-[#8A8A96]">Loading…</p> : shown.length === 0 ? <div className="p-6"><EmptyState icon="💳" title="No payments found" /></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-[#8A8A96] border-b border-white/[0.07]">
                                    <th className="px-5 py-3 font-semibold">When</th><th className="px-3 py-3 font-semibold">What</th><th className="px-3 py-3 font-semibold">Who</th>
                                    <th className="px-3 py-3 font-semibold text-right">Amount</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold text-right"></th>
                                </tr></thead>
                                <tbody>
                                    {shown.slice(0, 300).map(p => (
                                        <tr key={p.id} className="border-b border-white/[0.04]">
                                            <td className="px-5 py-3 text-[#A1A1AD] whitespace-nowrap">{when(p.createdAt)}</td>
                                            <td className="px-3 py-3 text-white max-w-[260px] truncate">{p.note || '—'}{p.partner && <span className="ml-2"><Pill accent="sky">Partner</Pill></span>}</td>
                                            <td className="px-3 py-3 text-[#A1A1AD] text-xs">{p.email || '—'}{p.cardLast4 && <span className="block">{p.cardBrand} •••• {p.cardLast4}</span>}</td>
                                            <td className="px-3 py-3 text-right text-white font-semibold">{money(p.amount)}</td>
                                            <td className="px-3 py-3">
                                                {p.refunded >= p.amount ? <Pill>Refunded</Pill> : p.refunded > 0 ? <Pill accent="amber">{money(p.refunded)} refunded</Pill> : p.duplicateOf ? <Pill accent="amber">Possible double</Pill> : <Pill accent="green">Paid</Pill>}
                                            </td>
                                            <td className="px-5 py-3 text-right whitespace-nowrap">
                                                {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-[#A1A1AD] hover:text-white mr-3">Receipt ↗</a>}
                                                {p.refundable > 0 && <Button size="sm" onClick={() => setRefunding({ p, dup: !!p.duplicateOf })}>Refund</Button>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {shown.length > 300 && <p className="p-4 text-xs text-[#8A8A96]">Showing the newest 300. Search to narrow it down.</p>}
                        </div>
                    )}
                </Card>
            </section>

            {refunds.length > 0 && (
                <section>
                    <SectionTitle title="Refunds you've issued here" />
                    <Card padded={false} className="overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                {refunds.map(r => (
                                    <tr key={r.id} className="border-b border-white/[0.04]">
                                        <td className="px-5 py-3 text-[#A1A1AD] whitespace-nowrap">{when(r.createdAt)}</td>
                                        <td className="px-3 py-3 text-white">{r.note || r.paymentId}</td>
                                        <td className="px-3 py-3 text-[#A1A1AD] text-xs">{r.email || '—'}</td>
                                        <td className="px-3 py-3 text-right text-white">{money(r.amount)}</td>
                                        <td className="px-5 py-3 text-xs text-[#8A8A96]">{r.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </section>
            )}

            <p className="text-sm text-[#8A8A96]">Refunds made directly in Square also show here, and they're taken out of filmmaker earnings automatically. Square may keep its original processing fee on a refund.</p>

            {refunding && <RefundDialog payment={refunding.p} isDuplicate={refunding.dup} onClose={() => setRefunding(null)} onDone={(m) => { setRefunding(null); setToast(m); setTimeout(() => setToast(''), 6000); load(); }} />}
        </div>
    );
};

export default PaymentsRefundsTab;
