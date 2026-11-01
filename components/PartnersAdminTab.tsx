import React, { useCallback, useEffect, useState } from 'react';
import { Movie } from '../types';
import { PartnerRecord, DraftCheck, SalesSummary, PayoutBreakdown, PartnerPayout, PWFF_PARTNER_ID } from '../api/_lib/partnerRules';
import { callAdminPartners, money, formatWhen } from '../services/partnerApi';

// ─────────────────────────────────────────────────────────────────────────────
// FESTIVAL IN A BOX — admin side. Create partners, invite their team, review
// and approve lineups, and settle sales at the end of the festival.
// ─────────────────────────────────────────────────────────────────────────────

type AdminPartner = PartnerRecord & {
    check: DraftCheck;
    cleanupPlan?: { dueAt: string | null; deleteFilmKeys: string[]; keepFilmKeys: string[] } | null;
    /** Screenings in this lineup that clash with another festival's (warning only). */
    overlaps?: { title: string; startsAt: string; otherFestival: string; otherTitle: string; otherStartsAt: string; otherEndsAt: string }[];
};

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const OverlapWarning: React.FC<{ overlaps: NonNullable<AdminPartner['overlaps']> }> = ({ overlaps }) => (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-1">
        <p className="text-sm font-bold text-amber-300">⚠ Overlaps another festival</p>
        {overlaps.map((o, i) => (
            <p key={i} className="text-sm text-amber-100/90">• "{o.title}" ({when(o.startsAt)}) overlaps <strong>{o.otherFestival}</strong>: "{o.otherTitle}", {when(o.otherStartsAt)}–{clock(o.otherEndsAt)}</p>
        ))}
        <p className="text-[11px] text-amber-200/70">Screenings within 30 minutes of each other count. You can still approve; this is only a warning.</p>
    </div>
);

const label = 'block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1.5';
const input = 'w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/40';
const card = 'bg-white/[0.03] border border-white/10 rounded-2xl p-5';
const btn = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40';
const btnPrimary = `${btn} bg-red-600 hover:bg-red-500 text-white`;
const btnGhost = `${btn} bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200`;

const STATE_BADGE: Record<string, string> = {
    draft: 'bg-white/10 text-gray-300',
    submitted: 'bg-amber-500/20 text-amber-300',
    changes_requested: 'bg-red-500/20 text-red-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
};
const STATE_TEXT: Record<string, string> = { draft: 'Draft', submitted: 'Ready for review', changes_requested: 'Changes requested', approved: 'Live' };

const CreatePartner: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
    const [form, setForm] = useState({ name: '', payeeName: '', contactEmail: '', crateSharePct: '30' });
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const create = async () => {
        setBusy(true); setErr('');
        try {
            await callAdminPartners('create', { ...form, crateSharePct: Number(form.crateSharePct) });
            setForm({ name: '', payeeName: '', contactEmail: '', crateSharePct: '30' });
            onCreated();
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <div className={`${card} grid md:grid-cols-[1.4fr_1.4fr_1.2fr_90px_auto] gap-3 items-end`}>
            <div><label className={label}>Festival / partner name</label><input className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Playhouse West Philadelphia" /></div>
            <div><label className={label}>Pay their share to</label><input className={input} value={form.payeeName} onChange={e => setForm({ ...form, payeeName: e.target.value })} placeholder="Playhouse West Arts Foundation, Inc." /></div>
            <div><label className={label}>Contact email</label><input className={input} value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div><label className={label}>CRATE %</label><input type="number" min={0} max={100} className={input} value={form.crateSharePct} onChange={e => setForm({ ...form, crateSharePct: e.target.value })} /></div>
            <button className={btnPrimary} disabled={busy || !form.name.trim()} onClick={create}>{busy ? 'Creating…' : 'Add partner'}</button>
            {err && <p className="text-red-400 text-sm md:col-span-5">{err}</p>}
        </div>
    );
};

const SetUpPwffCommittee: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const create = async () => {
        setBusy(true); setErr('');
        try {
            await callAdminPartners('create', { linkPwff: true, name: 'Playhouse West-Philadelphia Film Festival', payeeName: 'Playhouse West Arts Foundation, Inc.', crateSharePct: 30 });
            onCreated();
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    return (
        <div className={`${card} border-red-500/30`}>
            <p className="text-sm font-black text-white">PWFF committee access</p>
            <p className="text-sm text-gray-400 mt-1 max-w-3xl">Lets someone on the PWFF committee upload the films and build the schedule themselves at cratetv.net/partner. Their lineup appears on <strong className="text-gray-200">cratetv.net/pwff</strong> with the PWFF design, after you approve it, and counts as PWFF everywhere (all-access pass, festival report, filmmaker payouts). You can enter the lineup there yourself too: invite your own email to the team.</p>
            <button className={`${btnPrimary} mt-3`} disabled={busy} onClick={create}>{busy ? 'Setting up…' : 'Set up PWFF committee access'}</button>
            {err && <p className="text-red-400 text-sm mt-2">{err}</p>}
        </div>
    );
};

const Lineup: React.FC<{ p: AdminPartner }> = ({ p }) => {
    const draft = p.draft;
    if (!draft) return <p className="text-gray-500 text-sm">Nothing entered yet.</p>;
    const filmById = new Map(draft.films.map(f => [f.id, f]));
    return (
        <div className="space-y-5">
            <div className="grid md:grid-cols-[auto_1fr] gap-4 items-start">
                {draft.details.logoUrl && <img src={draft.details.logoUrl} alt="" className="h-14 w-auto object-contain" />}
                <div>
                    <p className="font-black text-white text-lg">{draft.details.title || '(no title)'}</p>
                    <p className="text-sm text-gray-400">{draft.details.tagline}</p>
                    <p className="text-xs text-gray-500 mt-1">{draft.details.startDate} → {draft.details.endDate} · pass {draft.details.passPrice ? money(draft.details.passPrice) : 'none'} · colour <span style={{ color: draft.details.accentColor }}>■</span> {draft.details.accentColor} · {draft.details.timeZone}</p>
                </div>
            </div>
            <div>
                <p className={label}>Films ({draft.films.length})</p>
                <div className="divide-y divide-white/5 border border-white/10 rounded-xl">
                    {draft.films.map(f => (
                        <div key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <div className="w-8 h-11 bg-white/5 rounded overflow-hidden flex-shrink-0">{f.posterUrl && <img src={f.posterUrl} alt="" className="w-full h-full object-cover" />}</div>
                            <div className="flex-1 min-w-0"><p className="text-white truncate">{f.title || 'Untitled'}</p><p className="text-xs text-gray-500 truncate">{f.director} · {f.durationInMinutes || '?'} min{f.keepAfterFestival ? ' · stays after festival' : ''}</p></div>
                            {f.videoUrl ? <a href={f.videoUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Preview video</a> : <span className="text-[10px] font-black uppercase tracking-widest text-red-400">No video</span>}
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <p className={label}>Schedule</p>
                <div className="space-y-3">
                    {[...draft.days].sort((a, b) => a.day - b.day).map(day => (
                        <div key={day.day} className="border border-white/10 rounded-xl p-3">
                            <p className="text-xs font-black text-gray-300 mb-2">Day {day.day}{day.date ? ` — ${day.date}` : ''}</p>
                            {day.blocks.map(b => (
                                <div key={b.id} className="text-sm py-1.5 border-t border-white/5 first:border-0">
                                    <span className="text-white font-bold">{b.title || 'Untitled block'}</span>
                                    <span className="text-gray-400"> · {formatWhen(b.screeningStartTime, draft.details.timeZone)} · {b.price >= 0 ? money(b.price) : 'no price'}{b.capacity ? ` · ${b.capacity} seats` : ''}</span>
                                    <p className="text-xs text-gray-500">{b.filmIds.map(id => filmById.get(id)?.title || '(removed)').join(' → ')}</p>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Sales: React.FC<{ p: AdminPartner; onSaved: () => void }> = ({ p, onSaved }) => {
    const [data, setData] = useState<{ sales: SalesSummary; payout: PayoutBreakdown; payoutStatus: PartnerPayout | null; tickets: any[]; squareFees?: { amount: number; sales: number; pending: number } | null; takeSquareFees?: boolean } | null>(null);
    const [takeFees, setTakeFees] = useState(p.payout?.takeSquareFees !== false);
    const [deductions, setDeductions] = useState(String(p.payout?.deductions ?? 0));
    const [deductionsNote, setDeductionsNote] = useState(p.payout?.deductionsNote || '');
    const [paidNote, setPaidNote] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        try { setData(await callAdminPartners('sales', { partnerId: p.id })); setErr(''); } catch (e) { setErr((e as Error).message); }
    }, [p.id]);
    useEffect(() => { load(); }, [load]);
    const savePayout = async (markPaid = false, clearPaid = false) => {
        if (!data) return;
        if (markPaid && !window.confirm(`Record ${money(data.payout.partnerAmount)} as paid to ${p.payeeName}?`)) return;
        setBusy(true); setErr('');
        try {
            await callAdminPartners('setPayout', { partnerId: p.id, deductions: Number(deductions) || 0, deductionsNote, takeSquareFees: takeFees, markPaid, clearPaid, paidAmount: data.payout.partnerAmount, paidNote });
            await load(); onSaved();
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    const downloadCsv = () => {
        if (!data) return;
        const rows = [['Date', 'Item', 'Type', 'Amount', 'Email']].concat(
            data.tickets.map(t => [t.purchasedAt || '', t.itemId || '', t.paymentType || '', String(t.amountPaid ?? 0), t.email || '']),
        );
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `${p.slug}-sales.csv`;
        a.click();
    };
    if (err && !data) return <p className="text-red-400 text-sm">{err}</p>;
    if (!data) return <p className="text-gray-500 text-sm">Loading sales…</p>;
    const { sales, payout, payoutStatus } = data;
    return (
        <div className="space-y-4">
            <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] uppercase tracking-widest text-gray-500"><th className="pb-2">Item</th><th className="pb-2 text-right">Orders</th><th className="pb-2 text-right">Sales</th></tr></thead>
                <tbody>
                    {[...sales.blocks, sales.pass, sales.rentals].map(l => (
                        <tr key={l.id} className="border-t border-white/5"><td className="py-2 text-white">{l.label}</td><td className="py-2 text-right text-gray-300">{l.orders}</td><td className="py-2 text-right text-white">{money(l.gross)}</td></tr>
                    ))}
                    <tr className="border-t border-white/20 font-black"><td className="py-2">Total</td><td className="py-2 text-right">{sales.totals.orders}</td><td className="py-2 text-right">{money(sales.totals.gross)}</td></tr>
                </tbody>
            </table>
            {p.id === PWFF_PARTNER_ID && <p className="text-[12px] text-amber-200/80">PWFF sales also appear in the Festival revenue report on the PWFF tab. Record the Playhouse West payout in one place only.</p>}
            <div className="grid md:grid-cols-[140px_1fr] gap-3 items-end">
                <div><label className={label}>Deductions ($)</label><input type="number" min={0} step="0.01" className={input} value={deductions} onChange={e => setDeductions(e.target.value)} /></div>
                <div><label className={label}>What for (shown to partner)</label><input className={input} value={deductionsNote} onChange={e => setDeductionsNote(e.target.value)} placeholder="e.g. test purchases, refunds" /></div>
            </div>
            <div className="bg-black/30 rounded-xl p-4 text-sm space-y-1">
                <p>Gross {money(payout.gross)} − deductions {money(payout.deductions)}{payout.squareFees > 0 && <> − Square card fees {money(payout.squareFees)}</>} = net <strong>{money(payout.net)}</strong></p>
                {p.id !== PWFF_PARTNER_ID && (
                    data.squareFees
                        ? <p className="text-gray-400 text-xs">Square took {money(data.squareFees.amount)} in card fees on {data.squareFees.sales} sale{data.squareFees.sales === 1 ? '' : 's'}{data.squareFees.pending > 0 ? `. ${data.squareFees.pending} recent sale${data.squareFees.pending === 1 ? '' : 's'} not reported by Square yet, so check again in a day or two` : ''}.</p>
                        : <p className="text-gray-500 text-xs">Square fees could not be loaded just now.</p>
                )}
                <p>CRATE {payout.crateSharePct}% = <strong>{money(payout.crateAmount)}</strong> · {p.payeeName} receives <strong className="text-emerald-300">{money(payout.partnerAmount)}</strong></p>
                {payoutStatus?.paidAt && <p className="text-emerald-400 font-bold">Paid {money(payoutStatus.paidAmount)} on {new Date(payoutStatus.paidAt).toLocaleDateString()}{payoutStatus.paidNote ? ` — ${payoutStatus.paidNote}` : ''}</p>}
            </div>
            <div className="flex gap-2 flex-wrap items-end">
                {p.id !== PWFF_PARTNER_ID && (
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                        <input type="checkbox" checked={takeFees} onChange={e => setTakeFees(e.target.checked)} className="accent-red-600" />
                        Take Square card fees off the top (before the split)
                    </label>
                )}
                <button className={btnGhost} disabled={busy} onClick={() => savePayout(false)}>Save deductions</button>
                <button className={btnGhost} onClick={downloadCsv}>Download sales CSV</button>
                {!payoutStatus?.paidAt ? (
                    <>
                        <input className={`${input} max-w-xs`} value={paidNote} onChange={e => setPaidNote(e.target.value)} placeholder="Payment note (check #, transfer id)" />
                        <button className={btnPrimary} disabled={busy} onClick={() => savePayout(true)}>Mark {money(payout.partnerAmount)} paid</button>
                    </>
                ) : <button className={btnGhost} disabled={busy} onClick={() => savePayout(false, true)}>Undo paid</button>}
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>
    );
};

// Removes a festival completely. Meant for test festivals; the server refuses
// if anyone paid for a ticket that hasn't been refunded.
const DeleteFestival: React.FC<{ p: AdminPartner; onDeleted: () => void }> = ({ p, onDeleted }) => {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const matches = typed.trim() === p.name.trim();
    const remove = async () => {
        setBusy(true); setErr('');
        try {
            await callAdminPartners('deleteFestival', { partnerId: p.id, confirmName: typed });
            onDeleted();
        } catch (e) { setErr((e as Error).message); setBusy(false); }
    };
    if (!open) {
        return (
            <div className="md:col-span-2 pt-3 border-t border-white/10">
                <button className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300" onClick={() => setOpen(true)}>Delete this festival…</button>
            </div>
        );
    }
    return (
        <div className="md:col-span-2 mt-2 rounded-xl border border-red-500/40 bg-red-950/30 p-4 space-y-3">
            <p className="text-sm font-black text-red-200">Delete {p.name} for good?</p>
            <p className="text-xs text-gray-300 leading-relaxed">This removes its festival page, schedule, films and uploaded files, watch parties and chat, and its team's portal access. It can't be undone. Ticket and sales records are kept for your money history. Films it let CRATE keep in the main catalog stay.</p>
            <p className="text-xs text-gray-300">If anyone paid for a ticket, refund it first in Payments &amp; refunds.</p>
            <label className={label} htmlFor={`del-${p.id}`}>Type <span className="text-white normal-case tracking-normal">{p.name}</span> to confirm</label>
            <input id={`del-${p.id}`} className={input} value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />
            {err && <p className="text-sm text-red-400">{err}</p>}
            <div className="flex gap-2 flex-wrap">
                <button className="bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black uppercase tracking-widest text-[11px] px-5 py-3 rounded-xl" disabled={!matches || busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete festival'}</button>
                <button className={btnGhost} disabled={busy} onClick={() => { setOpen(false); setTyped(''); setErr(''); }}>Cancel</button>
            </div>
        </div>
    );
};

const PartnerCard: React.FC<{ p: AdminPartner; onChanged: () => void }> = ({ p, onChanged }) => {
    const [open, setOpen] = useState<'lineup' | 'team' | 'sales' | 'settings' | null>(p.review?.state === 'submitted' ? 'lineup' : null);
    const [note, setNote] = useState('');
    const [invite, setInvite] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [settings, setSettings] = useState({ name: p.name, slug: p.slug, payeeName: p.payeeName, contactEmail: p.contactEmail, crateSharePct: String(p.crateSharePct) });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const run = async (fn: () => Promise<any>, ok: string) => {
        setBusy(true); setErr(''); setMsg('');
        try { const r = await fn(); setMsg(typeof r === 'string' ? r : ok); onChanged(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    const state = p.review?.state || 'draft';
    const blocks = (p.draft?.days || []).reduce((n, d) => n + d.blocks.length, 0);
    return (
        <div className={card}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-white">{p.name}</h3>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${STATE_BADGE[state]}`}>{STATE_TEXT[state]}</span>
                        {p.id === PWFF_PARTNER_ID && <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-600/30 text-red-200">PWFF</span>}
                        {p.status === 'archived' && <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/10 text-gray-400">Archived</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        {p.id === PWFF_PARTNER_ID ? 'cratetv.net/pwff' : `cratetv.net/festivals/${p.slug}`} · CRATE {p.crateSharePct}% · pays {p.payeeName} · {p.draft?.films.length || 0} films / {blocks} blocks · team: {(p.memberEmails || []).length}
                        {p.published && ` · live since ${new Date(p.published.publishedAt).toLocaleDateString()}`}
                    </p>
                    {p.cleanup?.deletedAt && (
                        <p className="text-xs text-gray-400 mt-1">Films cleaned up {new Date(p.cleanup.deletedAt).toLocaleDateString()}: {p.cleanup.deletedFilmKeys.length} deleted, {p.cleanup.keptFilmKeys.length} kept in catalog{p.cleanup.failedFiles?.length ? ` · ${p.cleanup.failedFiles.length} file(s) couldn't be deleted — check Logs` : ''}.</p>
                    )}
                    {(p.overlaps?.length || 0) > 0 && (
                        <p className="text-xs text-amber-300 font-bold mt-1">⚠ {p.overlaps!.length} screening{p.overlaps!.length > 1 ? 's overlap' : ' overlaps'} another festival. See Review lineup.</p>
                    )}
                    {!p.cleanup && p.cleanupPlan?.dueAt && (
                        <p className="text-xs text-gray-400 mt-1">Automatic film cleanup on {new Date(p.cleanupPlan.dueAt).toLocaleDateString()}: deletes {p.cleanupPlan.deleteFilmKeys.length} film(s), keeps {p.cleanupPlan.keepFilmKeys.length}.</p>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['lineup', 'team', 'sales', 'settings'] as const).map(k => (
                        <button key={k} className={open === k ? `${btn} bg-white text-black` : btnGhost} onClick={() => setOpen(open === k ? null : k)}>{k === 'lineup' ? 'Review lineup' : k}</button>
                    ))}
                    {p.published && <a className={btnGhost} href={p.id === PWFF_PARTNER_ID ? '/pwff' : `/festivals/${p.slug}`} target="_blank" rel="noopener noreferrer">Public page ↗</a>}
                </div>
            </div>
            {(msg || err) && <p className={`text-sm mt-3 ${err ? 'text-red-400' : 'text-emerald-400'}`}>{err || msg}</p>}

            {open === 'lineup' && (
                <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                    <Lineup p={p} />
                    {(p.overlaps?.length || 0) > 0 && <OverlapWarning overlaps={p.overlaps!} />}
                    <div>
                        <p className={label}>Checks</p>
                        {p.check.errors.length === 0 ? <p className="text-sm text-emerald-400 font-bold">✓ No blocking problems</p> : p.check.errors.map((e, i) => <p key={i} className="text-sm text-red-300">• {e}</p>)}
                        {p.check.warnings.map((w, i) => <p key={`w${i}`} className="text-sm text-amber-300/80">• {w}</p>)}
                    </div>
                    <div>
                        <label className={label}>Note to the partner (optional when approving)</label>
                        <textarea className={`${input} min-h-[80px]`} value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button className={btnPrimary} disabled={busy || p.check.errors.length > 0}
                            onClick={() => { if (window.confirm(`${p.overlaps?.length ? `Heads up: ${p.overlaps.length} screening${p.overlaps.length > 1 ? 's overlap' : ' overlaps'} another festival.\n\n` : ''}Publish ${p.name}'s lineup live now? Tickets go on sale immediately.`)) run(async () => { const r = await callAdminPartners('approve', { partnerId: p.id, note }); return `Published: ${r.films} films in ${r.blocks} blocks.`; }, 'Published.'); }}>
                            Approve & publish
                        </button>
                        <button className={btnGhost} disabled={busy || !note.trim()} onClick={() => run(() => callAdminPartners('requestChanges', { partnerId: p.id, note }), 'Sent back to the partner.')}>Request changes</button>
                    </div>
                    <p className="text-[11px] text-gray-500">Before approving a festival, run the rehearsal in docs/FESTIVAL-RUNBOOK.md with one of their blocks.</p>
                </div>
            )}

            {open === 'team' && (
                <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                    <div className="space-y-1">
                        {(p.memberEmails || []).length === 0 && <p className="text-sm text-gray-500">No one has joined yet.</p>}
                        {(p.memberEmails || []).map(e => (
                            <div key={e} className="flex items-center justify-between text-sm"><span className="text-white">{e}</span>
                                <button className="text-[10px] font-black uppercase tracking-widest text-red-400" onClick={() => { if (window.confirm(`Remove ${e} from ${p.name}?`)) run(() => callAdminPartners('removeMember', { partnerId: p.id, email: e }), 'Removed.'); }}>Remove</button>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 items-end flex-wrap">
                        <div className="flex-1 min-w-[220px]"><label className={label}>Invite by email</label><input className={input} value={invite} onChange={e => setInvite(e.target.value)} placeholder="committee@festival.org" /></div>
                        <button className={btnPrimary} disabled={busy || !invite.trim()} onClick={() => run(async () => { const r = await callAdminPartners('invite', { partnerId: p.id, email: invite }); setInviteLink(r.inviteLink); setInvite(''); return 'Invitation emailed.'; }, 'Invitation emailed.')}>Send invite</button>
                    </div>
                    {inviteLink && (
                        <div className="text-xs text-gray-400 break-all bg-black/30 rounded-xl p-3">
                            Also shareable directly (single use, 14 days): <span className="text-white">{inviteLink}</span>
                            <button className="ml-2 text-[10px] font-black uppercase tracking-widest text-red-400" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy</button>
                        </div>
                    )}
                    <p className="text-[11px] text-gray-500">They sign in (or create a free account) with the invited email, then open the link. Their portal is cratetv.net/partner.</p>
                </div>
            )}

            {open === 'sales' && <div className="mt-5 border-t border-white/10 pt-5"><Sales p={p} onSaved={onChanged} /></div>}

            {open === 'settings' && (
                <div className="mt-5 border-t border-white/10 pt-5 grid md:grid-cols-2 gap-3">
                    <div><label className={label}>Name</label><input className={input} value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} /></div>
                    {p.id !== PWFF_PARTNER_ID && <div><label className={label}>Web address (cratetv.net/festivals/…)</label><input className={input} value={settings.slug} onChange={e => setSettings({ ...settings, slug: e.target.value })} /></div>}
                    <div><label className={label}>Pay their share to</label><input className={input} value={settings.payeeName} onChange={e => setSettings({ ...settings, payeeName: e.target.value })} /></div>
                    <div><label className={label}>Contact email</label><input className={input} value={settings.contactEmail} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} /></div>
                    <div><label className={label}>CRATE share (%)</label><input type="number" min={0} max={100} className={input} value={settings.crateSharePct} onChange={e => setSettings({ ...settings, crateSharePct: e.target.value })} /></div>
                    <div className="flex items-end gap-2 flex-wrap">
                        <button className={btnPrimary} disabled={busy} onClick={() => run(() => callAdminPartners('update', { partnerId: p.id, ...settings, crateSharePct: Number(settings.crateSharePct) }), 'Saved.')}>Save settings</button>
                        <button className={btnGhost} disabled={busy} onClick={() => run(() => callAdminPartners('update', { partnerId: p.id, status: p.status === 'archived' ? 'active' : 'archived' }), p.status === 'archived' ? 'Restored.' : 'Archived.')}>{p.status === 'archived' ? 'Restore' : 'Archive'}</button>
                    </div>
                    <p className="text-[11px] text-gray-500 md:col-span-2">Changing the web address after launch breaks links already shared. Archiving hides the partner's portal access; published blocks stay until removed.</p>
                    {p.id !== PWFF_PARTNER_ID && <DeleteFestival p={p} onDeleted={onChanged} />}
                </div>
            )}
        </div>
    );
};

const PartnersAdminTab: React.FC<{ allMovies: Record<string, Movie> }> = () => {
    const [partners, setPartners] = useState<AdminPartner[] | null>(null);
    const [err, setErr] = useState('');
    const load = useCallback(async () => {
        try { setPartners((await callAdminPartners<{ partners: AdminPartner[] }>('list')).partners); setErr(''); }
        catch (e) { setErr((e as Error).message); }
    }, []);
    useEffect(() => { load(); }, [load]);
    const waiting = (partners || []).filter(p => p.review?.state === 'submitted').length;
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-white">Partner festivals</h2>
                <p className="text-sm text-gray-400 mt-1 max-w-3xl">Festival in a box: each partner's team builds their own lineup at cratetv.net/partner. You approve it before anything goes live, and settle sales here when the festival ends.</p>
                {waiting > 0 && <p className="text-sm text-amber-300 font-bold mt-2">{waiting} lineup{waiting > 1 ? 's' : ''} waiting for your review.</p>}
            </div>
            {partners && !partners.some(p => p.id === PWFF_PARTNER_ID) && <SetUpPwffCommittee onCreated={load} />}
            <CreatePartner onCreated={load} />
            {err && <p className="text-red-400 text-sm">{err}</p>}
            {!partners && !err && <p className="text-gray-500 text-sm">Loading…</p>}
            {partners?.length === 0 && <p className="text-gray-500 text-sm">No partners yet. Add your first one above.</p>}
            {partners?.map(p => <PartnerCard key={p.id} p={p} onChanged={load} />)}
        </div>
    );
};

export default PartnersAdminTab;
