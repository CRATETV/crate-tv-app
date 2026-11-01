import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, Field, Modal, Notice, PageHeader, Pill, SectionTitle, StatTile, adminPost, inputClass, money, shortDate } from './ui';
import { entriesToCsv, FORM_1099_THRESHOLD_CENTS } from '../../api/_lib/bookkeeping';

// ─────────────────────────────────────────────────────────────────────────────
// Bookkeeping: one place for every payment CRATE made and every tax form.
//   • Payments marked paid in Earnings & payouts land here by themselves.
//   • Payments made any other way (festival, check, expense) are added by hand.
//   • Each person has a W-9 status; "Request W-9" emails them the form.
// Entries are never erased, only crossed out (voided) with a reason.
// ─────────────────────────────────────────────────────────────────────────────

interface Entry { id: string; date: string; payee: string; amountCents: number; method: string; category: string; film: string; reference: string; note: string; source: string; void?: boolean; voidReason?: string }
interface Total { key: string; payee: string; totalCents: number; count: number; needs1099: boolean }
interface TaxDoc { payee: string; email?: string; w9: 'none' | 'requested' | 'received'; requestedAt?: string | null; receivedAt?: string | null; note?: string }
interface ListResult { year: number; years: number[]; entries: Entry[]; totals: Total[]; taxDocs: Record<string, TaxDoc> }

const CATEGORY_LABEL: Record<string, string> = { filmmaker: 'Filmmaker payout', partner: 'Partner festival', expense: 'Expense', other: 'Other' };
const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\//g, '-');

const AddDialog: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
    const [f, setF] = useState({ payee: '', amount: '', date: new Date().toISOString().slice(0, 10), method: '', category: 'filmmaker', film: '', reference: '', note: '' });
    const [busy, setBusy] = useState(false); const [error, setError] = useState('');
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
    const save = async () => {
        setBusy(true); setError('');
        try { await adminPost('/api/bookkeeping', { action: 'add', entry: f }); onSaved(); onClose(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); } finally { setBusy(false); }
    };
    return (
        <Modal title="Record a payment" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-[#A1A1AD]">For money you paid outside the payout button: a festival partner, a check, software, anything. Filmmaker payouts you mark paid are recorded for you.</p>
                <Field label="Who was paid?"><input className={inputClass} value={f.payee} onChange={set('payee')} placeholder="Name exactly as on their W-9" /></Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount (USD)"><input className={inputClass} inputMode="decimal" value={f.amount} onChange={set('amount')} placeholder="125.00" /></Field>
                    <Field label="Date paid"><input type="date" className={inputClass} value={f.date} onChange={set('date')} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Type"><select className={inputClass} value={f.category} onChange={set('category')}>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                    <Field label="How you paid"><input className={inputClass} value={f.method} onChange={set('method')} placeholder="PayPal, Zelle, check…" /></Field>
                </div>
                <Field label="Film or festival (optional)"><input className={inputClass} value={f.film} onChange={set('film')} /></Field>
                <Field label="Confirmation or check number (optional)"><input className={inputClass} value={f.reference} onChange={set('reference')} /></Field>
                <Field label="Note (optional)"><input className={inputClass} value={f.note} onChange={set('note')} /></Field>
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" accent="green" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save payment'}</Button></div>
            </div>
        </Modal>
    );
};

const BookkeepingTab: React.FC<{ onOpenTab?: (id: string) => void }> = ({ onOpenTab }) => {
    const [data, setData] = useState<ListResult | null>(null);
    const [year, setYear] = useState<number | undefined>();
    const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false); const [busyKey, setBusyKey] = useState('');
    const [notice, setNotice] = useState('');

    const load = useCallback(async (y?: number) => {
        setLoading(true); setError('');
        try { const r = await adminPost<ListResult>('/api/bookkeeping', { action: 'list', year: y }); setData(r); setYear(r.year); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not load.'); } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const act = async (key: string, body: Record<string, unknown>, done?: string) => {
        setBusyKey(key); setError(''); setNotice('');
        try { await adminPost('/api/bookkeeping', body); if (done) setNotice(done); await load(year); }
        catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); } finally { setBusyKey(''); }
    };

    const voidEntry = (e: Entry) => {
        const reason = window.prompt(`Cross out this ${money(e.amountCents)} payment to ${e.payee}?\nIt stays on record, marked voided. Why?`, '');
        if (reason) act(e.id, { action: 'void', id: e.id, reason }, 'Crossed out. It stays on record.');
    };
    const requestW9 = (name: string, existing?: string) => {
        const email = window.prompt(`Email address to send ${name}'s W-9 request to:`, existing || '');
        if (email) act(`w9-${name}`, { action: 'requestW9', payee: name, email }, `W-9 request sent to ${email}.`);
    };
    const downloadCsv = () => {
        if (!data) return;
        const blob = new Blob([entriesToCsv(data.entries as any)], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `crate-payments-${data.year}.csv`; a.click(); URL.revokeObjectURL(a.href);
    };

    const live = data?.entries.filter(e => !e.void) || [];
    const paidTotal = live.reduce((s, e) => s + e.amountCents, 0);
    const missingW9 = data?.totals.filter(t => (data.taxDocs[keyOf(t.payee)]?.w9 || 'none') !== 'received') || [];
    const need1099 = data?.totals.filter(t => t.needs1099) || [];

    return (
        <div className="space-y-10">
            <PageHeader title="Bookkeeping" accent="green" subtitle="Every payment CRATE made and every tax form, in one place. Nothing gets lost and nothing needs to be written by hand."
                actions={<><Button variant="primary" accent="green" onClick={() => setAdding(true)}>+ Record a payment</Button><Button onClick={downloadCsv} disabled={!data?.entries.length}>Download for my accountant</Button></>} />
            {error && <Notice tone="error">{error}</Notice>}
            {notice && <Notice tone="success">{notice}</Notice>}
            {loading && !data && <p className="text-[#8A8A96]">Loading…</p>}

            {data && (<>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-[#A1A1AD]">Tax year</span>
                    {data.years.map(y => <Button key={y} size="sm" variant={y === data.year ? 'primary' : 'secondary'} accent="green" onClick={() => load(y)}>{y}</Button>)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatTile label={`Paid out in ${data.year}`} value={money(paidTotal)} accent="green" hint={`${live.length} payment${live.length === 1 ? '' : 's'}`} />
                    <StatTile label="People paid" value={data.totals.length} accent="sky" />
                    <StatTile label="Missing a W-9" value={missingW9.length} accent={missingW9.length ? 'orange' : 'green'} hint="Request it below" />
                    <StatTile label="Will need a 1099" value={need1099.length} accent="violet" hint={`Paid ${money(FORM_1099_THRESHOLD_CENTS)}+ in the year`} />
                </div>

                <section>
                    <SectionTitle title="People & tax forms" hint="A W-9 is the form each person sends you once. Request it here before their first payout." />
                    {data.totals.length === 0 ? <EmptyState icon="🧾" title="No one paid yet this year" text="When you mark a payout as paid, the person shows up here with their W-9 status." /> : (
                        <Card padded={false}><div className="divide-y divide-white/[0.06]">
                            {data.totals.map(t => {
                                const doc = data.taxDocs[keyOf(t.payee)];
                                const st = doc?.w9 || 'none';
                                return (
                                    <div key={t.key} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold truncate">{t.payee}</p>
                                            <p className="text-xs text-[#8A8A96]">{money(t.totalCents)} over {t.count} payment{t.count === 1 ? '' : 's'}{doc?.email ? ` · ${doc.email}` : ''}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {t.needs1099 && <Pill accent="violet">1099 due in January</Pill>}
                                            {st === 'received' ? <Pill accent="green">W-9 on file{doc?.receivedAt ? ` · ${shortDate(doc.receivedAt)}` : ''}</Pill>
                                                : st === 'requested' ? <Pill accent="orange">W-9 requested{doc?.requestedAt ? ` · ${shortDate(doc.requestedAt)}` : ''}</Pill>
                                                : <Pill accent="coral">No W-9 yet</Pill>}
                                            {st !== 'received' && <Button size="sm" disabled={busyKey === `w9-${t.payee}`} onClick={() => requestW9(t.payee, doc?.email)}>{st === 'requested' ? 'Send again' : 'Request W-9'}</Button>}
                                            {st !== 'received' && <Button size="sm" variant="ghost" onClick={() => act(`rx-${t.key}`, { action: 'setTaxDoc', payee: t.payee, w9: 'received' }, `Marked ${t.payee}'s W-9 as received.`)}>I have it</Button>}
                                            {st === 'received' && <Button size="sm" variant="ghost" onClick={() => act(`rx-${t.key}`, { action: 'setTaxDoc', payee: t.payee, w9: 'none' })}>Undo</Button>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div></Card>
                    )}
                    <p className="text-xs text-[#8A8A96] mt-3">Replies with the filled-in form arrive in Email → Received. Keep the PDF in <button className="underline" onClick={() => onOpenTab?.('contracts')}>Contracts → vault</button>, which is private. Then press "I have it". This page records the status only, never the form itself or any tax numbers.</p>
                </section>

                <section>
                    <SectionTitle title="Every payment" hint="Newest first. Crossing out keeps the line on record." />
                    {data.entries.length === 0 ? <EmptyState icon="📒" title={`No payments recorded for ${data.year}`} text="Payouts you mark paid appear here by themselves. Use “Record a payment” for anything else." /> : (
                        <Card padded={false}><div className="overflow-x-auto"><table className="w-full text-sm">
                            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#8A8A96]"><th className="p-3">Date</th><th className="p-3">Paid to</th><th className="p-3 text-right">Amount</th><th className="p-3">How</th><th className="p-3">Type</th><th className="p-3">Details</th><th className="p-3" /></tr></thead>
                            <tbody className="divide-y divide-white/[0.06]">
                                {data.entries.map(e => (
                                    <tr key={e.id} className={e.void ? 'opacity-50' : ''}>
                                        <td className="p-3 text-[#C9C9D1] whitespace-nowrap">{e.date}</td>
                                        <td className={`p-3 text-white font-semibold ${e.void ? 'line-through' : ''}`}>{e.payee}</td>
                                        <td className={`p-3 text-right text-white tabular-nums ${e.void ? 'line-through' : ''}`}>{money(e.amountCents)}</td>
                                        <td className="p-3 text-[#A1A1AD]">{e.method || '—'}</td>
                                        <td className="p-3"><Pill accent={e.category === 'expense' ? 'gray' : 'green'}>{CATEGORY_LABEL[e.category] || e.category}</Pill></td>
                                        <td className="p-3 text-xs text-[#8A8A96]">{[e.film, e.reference && `Ref ${e.reference}`, e.note, e.void && `Voided: ${e.voidReason}`].filter(Boolean).join(' · ') || (e.source === 'payout' ? 'Marked paid in Earnings & payouts' : '')}</td>
                                        <td className="p-3 text-right">{!e.void && <Button size="sm" variant="ghost" onClick={() => voidEntry(e)}>Cross out</Button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div></Card>
                    )}
                </section>

                <Notice tone="info">Signed agreements live in <button className="underline" onClick={() => onOpenTab?.('contracts')}>Contracts</button>. Each one stores the exact wording signed, the date and the signer’s details. Your accountant can use the download above for taxes. Not tax advice.</Notice>
            </>)}
            {adding && <AddDialog onClose={() => setAdding(false)} onSaved={() => load(year)} />}
        </div>
    );
};

export default BookkeepingTab;
