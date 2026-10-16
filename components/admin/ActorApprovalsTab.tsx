import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActorSubmission } from '../../types';
import { Button, Card, EmptyState, Modal, Notice, PageHeader, Pill, SectionTitle, StatTile, adminPost, inputClass, shortDate } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Actor approvals. Actors who sign up at /actor-signup land here. Nothing is
// public until you approve it. Approving publishes the profile in the actors
// directory and emails them; rejecting emails them your reason (optional).
// Uses the existing endpoints: get-actor-submissions, approve-/reject-actor-submission.
// ─────────────────────────────────────────────────────────────────────────────

type Sub = ActorSubmission & { agreementSignatureId?: string; agreementVersion?: string };

const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000).toISOString();
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    return null;
};

const ActorApprovalsTab: React.FC<{ onCountChange?: (n: number) => void }> = ({ onCountChange }) => {
    const [subs, setSubs] = useState<Sub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [rejecting, setRejecting] = useState<Sub | null>(null);
    const [reason, setReason] = useState('');
    const [viewing, setViewing] = useState<Sub | null>(null);
    const [toast, setToast] = useState('');
    const [showProcessed, setShowProcessed] = useState(false);
    // Kept in a ref so a new callback from the parent never re-triggers loading.
    const countRef = useRef(onCountChange);
    countRef.current = onCountChange;

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const r = await adminPost<{ submissions: Sub[] }>('/api/get-actor-submissions', {});
            setSubs(r.submissions || []);
            countRef.current?.((r.submissions || []).filter(s => s.status === 'pending').length);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load actor sign-ups.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };

    const approve = async (s: Sub) => {
        setBusy(s.id);
        try { await adminPost('/api/approve-actor-submission', { submissionId: s.id }); flash(`${s.actorName} is approved and live. We emailed them.`); load(); }
        catch (e) { alert(e instanceof Error ? e.message : 'Could not approve.'); }
        finally { setBusy(''); }
    };
    const reject = async () => {
        if (!rejecting) return;
        setBusy(rejecting.id);
        try { await adminPost('/api/reject-actor-submission', { submissionId: rejecting.id, reason }); flash(`${rejecting.actorName}'s profile was declined.`); setRejecting(null); setReason(''); load(); }
        catch (e) { alert(e instanceof Error ? e.message : 'Could not decline.'); }
        finally { setBusy(''); }
    };

    const pending = subs.filter(s => s.status === 'pending');
    const processed = subs.filter(s => s.status !== 'pending');

    return (
        <div className="space-y-10">
            <PageHeader title="Actor approvals" subtitle="New actor profiles wait here until you approve them. Nothing goes public before you say yes." accent="magenta"
                actions={<><a href="/actors-directory" target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm font-bold">View directory ↗</a><Button onClick={load}>↻ Refresh</Button></>} />
            {toast && <Notice tone="success">{toast}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatTile label="Waiting for you" icon="🎭" accent="magenta" value={pending.length} />
                <StatTile label="Approved" icon="✅" accent="green" value={subs.filter(s => s.status === 'approved').length} />
                <StatTile label="Declined" icon="✋" accent="gray" value={subs.filter(s => s.status === 'rejected').length} />
            </div>

            <section>
                <SectionTitle title="Waiting for approval" hint="Check the photos and bio, then approve or decline." />
                {loading ? <p className="text-[#8A8A96]">Loading…</p> : pending.length === 0 ? (
                    <EmptyState icon="🎬" title="No one waiting" text="When actors sign up at cratetv.net/actor-signup, they'll appear here." />
                ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {pending.map(s => (
                            <Card key={s.id} accent="magenta" padded={false} className="overflow-hidden">
                                <button className="block w-full aspect-[4/3] bg-white/5" onClick={() => setViewing(s)}>
                                    {s.highResPhotoUrl || s.photoUrl ? <img src={s.highResPhotoUrl || s.photoUrl} alt={s.actorName} className="w-full h-full object-cover" /> : null}
                                </button>
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-lg truncate">{s.actorName}</p>
                                            <p className="text-xs text-[#8A8A96] truncate">{s.email} · {shortDate(toIso(s.submissionDate))}</p>
                                        </div>
                                        {s.agreementSignatureId ? <Pill accent="green">Agreement ✓</Pill> : <Pill accent="amber">No agreement</Pill>}
                                    </div>
                                    <p className="text-sm text-[#C9C9D1] mt-3 line-clamp-4">{s.bio}</p>
                                    {s.imdbUrl && <a href={s.imdbUrl} target="_blank" rel="noreferrer" className="text-xs underline text-[#3BB2FF] mt-2 inline-block">IMDb ↗</a>}
                                    <div className="flex gap-2 mt-4">
                                        <Button variant="primary" accent="green" className="flex-1" disabled={busy === s.id} onClick={() => approve(s)}>{busy === s.id ? 'Working…' : 'Approve'}</Button>
                                        <Button variant="danger" disabled={busy === s.id} onClick={() => { setRejecting(s); setReason(''); }}>Decline</Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {processed.length > 0 && (
                <section>
                    <SectionTitle title="Already reviewed" right={<Button size="sm" variant="ghost" onClick={() => setShowProcessed(v => !v)}>{showProcessed ? 'Hide' : `Show ${processed.length}`}</Button>} />
                    {showProcessed && (
                        <Card padded={false} className="overflow-hidden">
                            <table className="w-full text-sm">
                                <tbody>
                                    {processed.map(s => (
                                        <tr key={s.id} className="border-b border-white/[0.04]">
                                            <td className="px-5 py-3 w-14">{s.photoUrl && <img src={s.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />}</td>
                                            <td className="px-3 py-3"><p className="text-white font-semibold">{s.actorName}</p><p className="text-xs text-[#8A8A96]">{s.email}</p></td>
                                            <td className="px-3 py-3">{s.status === 'approved' ? <Pill accent="green">Approved</Pill> : <Pill>Declined</Pill>}</td>
                                            <td className="px-5 py-3 text-xs text-[#8A8A96]">{s.rejectionReason || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </section>
            )}

            {viewing && (
                <Modal title={viewing.actorName} onClose={() => setViewing(null)} wide>
                    <div className="grid md:grid-cols-2 gap-5">
                        <img src={viewing.highResPhotoUrl || viewing.photoUrl} alt={viewing.actorName} className="w-full rounded-2xl object-cover" />
                        <div>
                            <p className="text-sm text-[#8A8A96]">{viewing.email}</p>
                            <p className="text-[#C9C9D1] mt-3 whitespace-pre-line">{viewing.bio}</p>
                            {viewing.photoUrl && <div className="mt-4"><p className="text-xs text-[#8A8A96] mb-1">Square profile photo</p><img src={viewing.photoUrl} alt="" className="w-24 h-24 rounded-xl object-cover" /></div>}
                        </div>
                    </div>
                </Modal>
            )}
            {rejecting && (
                <Modal title={`Decline ${rejecting.actorName}?`} onClose={() => setRejecting(null)}>
                    <p className="text-sm text-[#A1A1AD] mb-3">Optional: tell them why. If you write something, we'll email it to them; if you leave it empty, no email is sent.</p>
                    <textarea className={inputClass} rows={4} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Please upload a clearer headshot and resubmit." />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
                        <Button variant="danger" disabled={busy === rejecting.id} onClick={reject}>Decline profile</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ActorApprovalsTab;
