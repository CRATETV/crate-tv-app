import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Notice, Pill, SectionTitle, adminPost, shortDate } from './ui';

// Filmmaker dashboards: who can see a credited name's earnings and choose
// where that money is paid. Requests CRATE couldn't confirm by email wait
// here (see api/filmmaker-signup.ts). Shown in Earnings & payouts.

interface Pending { uid: string; name: string; email: string; createdAt: string | null; emailConfirmed?: boolean }
interface Filmmaker { uid: string; name: string; email: string; via: string; at: string | null }

const FilmmakerClaimsPanel: React.FC = () => {
    const [pending, setPending] = useState<Pending[]>([]);
    const [filmmakers, setFilmmakers] = useState<Filmmaker[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [showAll, setShowAll] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await adminPost<{ pending: Pending[]; filmmakers: Filmmaker[] }>('/api/admin-filmmaker-claims', { action: 'list' });
            setPending(r.pending || []); setFilmmakers(r.filmmakers || []); setError('');
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load filmmaker dashboards.'); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const act = async (action: 'approve' | 'decline' | 'revoke', uid: string, label: string) => {
        if (action === 'revoke' && !window.confirm(`Switch off the filmmaker dashboard for ${label}? They'll no longer see earnings or be able to request payouts.`)) return;
        setBusy(uid);
        try { await adminPost('/api/admin-filmmaker-claims', { action, uid }); await load(); }
        catch (e) { setError(e instanceof Error ? e.message : 'That didn\'t work.'); }
        finally { setBusy(''); }
    };

    const unchecked = filmmakers.filter(f => f.via.startsWith('before'));

    return (
        <section className="space-y-4">
            <SectionTitle title="Filmmaker dashboards" hint="Who can see a filmmaker's earnings and choose where their money goes."
                right={<Button size="sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Hide accounts' : `All accounts (${filmmakers.length})`}</Button>} />
            {error && <Notice tone="error">{error}</Notice>}

            {pending.length > 0 && (
                <Card accent="amber">
                    <p className="text-white font-bold mb-1">Waiting for you ({pending.length})</p>
                    <p className="text-sm text-[#A1A1AD] mb-4">CRATE doesn't have these emails on file for the filmmaker. Only approve if you're sure it's really them, for example they emailed you from the address you know.</p>
                    <div className="space-y-3">
                        {pending.map(p => (
                            <div key={p.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3">
                                <div className="min-w-0">
                                    <p className="text-white font-semibold truncate">{p.name}</p>
                                    <p className="text-xs text-[#8A8A96] truncate">{p.email}{p.createdAt ? ` · asked ${shortDate(p.createdAt)}` : ''}</p>
                                    <div className="mt-1">
                                        {p.emailConfirmed
                                            ? <Pill accent="green">email confirmed</Pill>
                                            : <Pill accent="amber">email not confirmed: anyone could have typed this address</Pill>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="primary" accent="green" disabled={busy === p.uid} onClick={() => act('approve', p.uid, p.name)}>Approve</Button>
                                    <Button size="sm" variant="ghost" disabled={busy === p.uid} onClick={() => act('decline', p.uid, p.name)}>Decline</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {unchecked.length > 0 && !showAll && (
                <Notice tone="warn">{unchecked.length} filmmaker account{unchecked.length > 1 ? 's were' : ' was'} set up before October 2026, when anyone could claim a name. Open "All accounts" and check each email is really that filmmaker's.</Notice>
            )}

            {showAll && (
                <Card padded={false}>
                    <div className="divide-y divide-white/[0.06]">
                        {filmmakers.length === 0 && <p className="p-4 text-sm text-[#8A8A96]">No filmmaker accounts yet.</p>}
                        {filmmakers.map(f => (
                            <div key={f.uid} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                <div className="min-w-0">
                                    <p className="text-white font-semibold truncate">{f.name || '(no name)'}</p>
                                    <p className="text-xs text-[#8A8A96] truncate">{f.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Pill accent={f.via.startsWith('before') ? 'amber' : 'green'}>{f.via}</Pill>
                                    <Button size="sm" variant="ghost" disabled={busy === f.uid} onClick={() => act('revoke', f.uid, f.name || f.email)}>Switch off</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </section>
    );
};

export default FilmmakerClaimsPanel;
