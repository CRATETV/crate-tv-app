import React, { useEffect, useState } from 'react';
import { Card, SectionTitle, adminPost } from './ui';
import { backupHealth, type BackupStatus } from '../../api/_lib/backup';

const TONE = { good: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400' } as const;
const ICON = { good: '✓', warn: '!', bad: '✕' } as const;

// Overview → Backups: is the weekly copy of the database happening? Top admin only.
const BackupCard: React.FC = () => {
    const [state, setState] = useState<{ configured: boolean; status: BackupStatus | null } | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const load = () => adminPost<any>('/api/admin-backup', { action: 'status' }).then(setState).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);
    const run = async () => {
        setBusy(true); setErr('');
        try { setState(await adminPost<any>('/api/admin-backup', { action: 'run' })); }
        catch (e) { setErr(e instanceof Error ? e.message : 'Backup failed.'); }
        setBusy(false);
    };
    const h = state ? backupHealth(state.configured, state.status, Date.now()) : null;
    return (
        <section>
            <SectionTitle title="Backups" hint="A weekly copy of your database and catalog, kept in a private place. Newest 8 are kept." />
            <Card>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div role="status">
                        {h ? (
                            <>
                                <p className={`font-bold ${TONE[h.tone]}`}><span aria-hidden="true">{ICON[h.tone]} </span>{h.headline}</p>
                                <p className="text-sm text-[#8A8A96] mt-1">{h.detail}</p>
                            </>
                        ) : <p className="text-[#8A8A96]">{err || 'Checking…'}</p>}
                        {err && h && <p className="text-sm text-red-400 mt-1">{err}</p>}
                    </div>
                    {state?.configured && (
                        <button onClick={run} disabled={busy} className="shrink-0 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold disabled:opacity-60">
                            {busy ? 'Backing up…' : 'Back up now'}
                        </button>
                    )}
                </div>
            </Card>
        </section>
    );
};
export default BackupCard;
