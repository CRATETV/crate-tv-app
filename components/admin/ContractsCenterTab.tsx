import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Movie, MoviePipelineEntry, Category } from '../../types';
import { CONTRACT_TEMPLATES, ContractTemplate, renderContract } from '../../api/_lib/contractTemplates';
import ContractText from '../ContractText';
import ContractsTab from '../ContractsTab';
import { Button, Card, EmptyState, Field, Modal, Notice, PageHeader, Pill, SectionTitle, StatTile, adminPost, copyText, inputClass, shortDate } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Contracts & Signatures. Send an agreement as a signing link, track who has
// signed, open signed copies. Uploaded PDFs (W-9s, paper contracts) live in
// the vault at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

interface RequestRow { token: string; link: string; templateId: string; templateTitle: string; recipientName: string; recipientEmail: string; filmTitle: string | null; movieKey: string | null; filmmakerPercent: number | null; status: 'sent' | 'signed' | 'void'; createdAt: string | null; signedAt: string | null; lastSentAt: string | null; signatureId: string | null }
interface SignatureRow { id: string; templateId: string; templateTitle: string; templateVersion: string; signerName: string; signerEmail: string; typedSignature: string; signedAt: string | null; context: string; filmTitle: string | null; requestToken: string | null }
interface FullSignature extends SignatureRow { text: string; ip: string; userAgent: string; fingerprint: string }

const AUDIENCE_LABEL: Record<string, { label: string; accent: 'green' | 'violet' | 'sky' }> = {
    filmmaker: { label: 'Filmmakers', accent: 'green' },
    actor: { label: 'Actors', accent: 'violet' },
    anyone: { label: 'Anyone', accent: 'sky' },
};

const SendDialog: React.FC<{ template: ContractTemplate; movies: Movie[]; onClose: () => void; onSent: () => void }> = ({ template: initial, movies, onClose, onSent }) => {
    const [templateId, setTemplateId] = useState(initial.id);
    const template = CONTRACT_TEMPLATES.find(t => t.id === templateId) || initial;
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [movieKey, setMovieKey] = useState('');
    const [percent, setPercent] = useState('');
    const [sendEmail, setSendEmail] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ link: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const sortedMovies = useMemo(() => [...movies].sort((a, b) => (a.title || '').localeCompare(b.title || '')), [movies]);
    const movie = movies.find(m => m.key === movieKey);

    // Pre-fill the person from the film's credits.
    useEffect(() => {
        if (movie && !name) setName((movie.director || '').split(',')[0].trim());
    }, [movieKey]);

    const send = async () => {
        setBusy(true); setError('');
        try {
            const r = await adminPost<{ link: string }>('/api/contracts', {
                action: 'admin-create', templateId, recipientName: name, recipientEmail: email, movieKey,
                filmmakerPercent: percent === '' ? undefined : Number(percent), sendEmail,
            });
            setResult(r);
            onSent();
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not create the link.'); }
        finally { setBusy(false); }
    };

    if (result) {
        return (
            <Modal title="Ready to sign" onClose={onClose}>
                <div className="space-y-4">
                    <Notice tone="success">{sendEmail ? `We emailed ${email} a link to review and sign.` : 'Link created. Send it to them however you like.'}</Notice>
                    <Field label="Signing link"><input readOnly className={inputClass} value={result.link} onFocus={e => e.target.select()} /></Field>
                    <div className="flex justify-end gap-2">
                        <Button onClick={async () => { if (await copyText(result.link)) setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy link'}</Button>
                        <Button variant="primary" onClick={onClose}>Done</Button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal title="Send for signature" onClose={onClose}>
            <div className="space-y-4">
                <Field label="Agreement">
                    <select className={inputClass} value={templateId} onChange={e => setTemplateId(e.target.value)}>
                        {CONTRACT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                </Field>
                {template.needsFilm && (
                    <>
                        <Field label="Film">
                            <select className={inputClass} value={movieKey} onChange={e => setMovieKey(e.target.value)}>
                                <option value="">Choose a film…</option>
                                {sortedMovies.map(m => <option key={m.key} value={m.key}>{m.title}</option>)}
                            </select>
                        </Field>
                        {template.id === 'filmmaker-distribution' && (
                            <Field label="Filmmaker share (%)" hint="Leave empty to use the film's current split from Earnings & Payouts (70% by default).">
                                <input className={`${inputClass} w-32`} inputMode="decimal" value={percent} onChange={e => setPercent(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="70" />
                            </Field>
                        )}
                    </>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Their full legal name"><input className={inputClass} value={name} onChange={e => setName(e.target.value)} /></Field>
                    <Field label="Their email"><input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                </div>
                <label className="flex items-center gap-3 text-sm text-[#C9C9D1]">
                    <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="w-4 h-4" />
                    Email them the signing link now
                </label>
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" accent="violet" disabled={busy || !name || !email || (template.needsFilm && !movieKey)} onClick={send}>{busy ? 'Creating…' : sendEmail ? 'Send' : 'Create link'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const PreviewDialog: React.FC<{ template: ContractTemplate; onClose: () => void; onSend: () => void }> = ({ template, onClose, onSend }) => (
    <Modal title={template.title} onClose={onClose} wide>
        <p className="text-sm text-[#8A8A96] mb-4">Version {template.version} · Words in [brackets] are filled in when you send it.</p>
        <div className="rounded-2xl bg-white p-6 md:p-8 max-h-[60vh] overflow-y-auto"><ContractText text={renderContract(template, {})} /></div>
        <div className="flex justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button variant="primary" accent="violet" onClick={onSend}>Send this agreement</Button>
        </div>
    </Modal>
);

const SignedCopyDialog: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
    const [sig, setSig] = useState<FullSignature | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        adminPost<{ signature: FullSignature }>('/api/contracts', { action: 'admin-view', signatureId: id })
            .then(r => setSig(r.signature)).catch(e => setError(e.message));
    }, [id]);
    return (
        <Modal title={sig ? sig.templateTitle : 'Signed copy'} onClose={onClose} wide>
            {error && <Notice tone="error">{error}</Notice>}
            {!sig && !error && <p className="text-[#8A8A96]">Loading…</p>}
            {sig && (
                <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[#8A8A96] text-xs">Signed by</p><p className="text-white font-bold">{sig.signerName}</p><p className="text-[#A1A1AD] text-xs">{sig.signerEmail}</p></div>
                        <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[#8A8A96] text-xs">Typed signature</p><p className="text-white text-lg" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>{sig.typedSignature}</p></div>
                        <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[#8A8A96] text-xs">Signed</p><p className="text-white font-bold">{sig.signedAt ? new Date(sig.signedAt).toLocaleString() : '—'}</p><p className="text-[#A1A1AD] text-xs">Version {sig.templateVersion}</p></div>
                    </div>
                    <div className="rounded-2xl bg-white p-6 md:p-8 max-h-[50vh] overflow-y-auto"><ContractText text={sig.text} /></div>
                    <p className="text-xs text-[#5A5A66] break-all">Evidence: IP {sig.ip} · {sig.userAgent} · SHA-256 {sig.fingerprint}</p>
                    <div className="flex justify-end gap-2">
                        {sig.requestToken && <a className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm font-bold" href={`/sign?t=${sig.requestToken}`} target="_blank" rel="noreferrer">Open printable copy ↗</a>}
                        <Button variant="primary" onClick={onClose}>Close</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const OnboardDialog: React.FC<{ movie: Movie; email: string; onClose: () => void; onSent: () => void }> = ({ movie, email: initialEmail, onClose, onSent }) => {
    const [name, setName] = useState((movie.director || '').split(',')[0].trim());
    const [email, setEmail] = useState(initialEmail);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const send = async () => {
        setBusy(true); setError('');
        try { await adminPost('/api/contracts', { action: 'admin-onboard', movieKey: movie.key, recipientName: name, recipientEmail: email }); onSent(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not send.'); }
        finally { setBusy(false); }
    };
    return (
        <Modal title={`Agreements for “${movie.title}”`} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-sm text-[#A1A1AD]">Sends one friendly email with both agreements (Filmmaker Distribution Agreement and Rights &amp; Clearances Warranty), plus the link to set up their dashboard and payout method.</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Filmmaker's full name"><input className={inputClass} value={name} onChange={e => setName(e.target.value)} /></Field>
                    <Field label="Their email" hint={initialEmail ? 'From their submission.' : 'Not on file — add it.'}><input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
                </div>
                {error && <Notice tone="error">{error}</Notice>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" accent="violet" disabled={busy || !name || !email} onClick={send}>{busy ? 'Sending…' : 'Send both agreements'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const ContractsCenterTab: React.FC<{ movies: Record<string, Movie>; pipeline?: MoviePipelineEntry[]; categories?: Record<string, Category> }> = ({ movies, pipeline = [], categories = {} }) => {
    const [onboarding, setOnboarding] = useState<Movie | null>(null);
    const [showAllMissing, setShowAllMissing] = useState(false);
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [signatures, setSignatures] = useState<SignatureRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sending, setSending] = useState<ContractTemplate | null>(null);
    const [previewing, setPreviewing] = useState<ContractTemplate | null>(null);
    const [viewing, setViewing] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'sent' | 'signed' | 'void'>('all');
    const [query, setQuery] = useState('');
    const [toast, setToast] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const r = await adminPost<{ requests: RequestRow[]; signatures: SignatureRow[] }>('/api/contracts', { action: 'admin-list' });
            setRequests(r.requests); setSignatures(r.signatures);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not load contracts.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };
    const act = async (action: 'admin-void' | 'admin-resend', token: string) => {
        if (action === 'admin-void' && !confirm('Withdraw this agreement? The link will stop working.')) return;
        try { await adminPost('/api/contracts', { action, token }); flash(action === 'admin-void' ? 'Agreement withdrawn.' : 'Reminder sent.'); load(); }
        catch (e) { alert(e instanceof Error ? e.message : 'Something went wrong.'); }
    };

    const awaiting = requests.filter(r => r.status === 'sent');
    const otherSignatures = signatures.filter(s => s.context !== 'signing-link');
    const shown = requests.filter(r => (filter === 'all' || r.status === filter) && (!query.trim() || `${r.recipientName} ${r.recipientEmail} ${r.templateTitle} ${r.filmTitle || ''}`.toLowerCase().includes(query.toLowerCase())));
    const signedCountFor = (id: string) => signatures.filter(s => s.templateId === id).length;

    // Films on CRATE with a credited filmmaker but no distribution agreement sent or signed.
    // Public-domain classics are left out — there's nobody to sign for them.
    const classics = useMemo(() => new Set(categories.publicDomainIndie?.movieKeys || []), [categories]);
    const covered = useMemo(() => new Set(requests.filter(r => r.templateId === 'filmmaker-distribution' && r.status !== 'void' && r.movieKey).map(r => r.movieKey!)), [requests]);
    const missing = useMemo(() => Object.values(movies)
        .filter(m => m.key && (m.director || '').trim() && !classics.has(m.key) && !covered.has(m.key))
        .sort((a, b) => (a.title || '').localeCompare(b.title || '')), [movies, classics, covered]);
    const emailFor = (m: Movie) => {
        const t = (m.title || '').trim().toLowerCase();
        const p = pipeline.find(x => (x as any).movieKey === m.key) || pipeline.find(x => (x.title || '').trim().toLowerCase() === t);
        return String(p?.email || p?.submitterEmail || '');
    };

    return (
        <div className="space-y-10">
            <PageHeader
                title="Contracts & Signatures"
                subtitle="Send agreements to filmmakers and actors, see who has signed, and keep every signed copy in one place."
                accent="violet"
                actions={<Button variant="primary" accent="violet" onClick={() => setSending(CONTRACT_TEMPLATES[0])}>+ Send an agreement</Button>}
            />
            {toast && <Notice tone="success">{toast}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile label="Waiting for a signature" icon="✍️" accent="amber" value={awaiting.length} onClick={() => setFilter('sent')} />
                <StatTile label="Signed through links" icon="✅" accent="green" value={requests.filter(r => r.status === 'signed').length} onClick={() => setFilter('signed')} />
                <StatTile label="Actor agreements" icon="🎭" accent="violet" value={otherSignatures.filter(s => s.context === 'actor-signup').length} hint="Accepted at profile signup" />
                <StatTile label="Agreement templates" icon="📚" accent="sky" value={CONTRACT_TEMPLATES.length} />
            </div>

            <Notice tone="warn">These agreements are plain-English templates written for how CRATE works. Have a lawyer review them before you rely on them. Philadelphia Volunteer Lawyers for the Arts (pvla.org) helps artists for free or at low cost.</Notice>

            {!loading && missing.length > 0 && (
                <section>
                    <SectionTitle
                        title={`Films missing agreements (${missing.length})`}
                        hint="These films are on CRATE but their filmmaker hasn't been sent the distribution agreement yet. New approvals get them automatically."
                        right={missing.length > 6 ? <Button size="sm" variant="ghost" onClick={() => setShowAllMissing(v => !v)}>{showAllMissing ? 'Show fewer' : `Show all ${missing.length}`}</Button> : undefined}
                    />
                    <Card padded={false} className="overflow-hidden">
                        <table className="w-full text-sm">
                            <tbody>
                                {(showAllMissing ? missing : missing.slice(0, 6)).map(m => (
                                    <tr key={m.key} className="border-b border-white/[0.04]">
                                        <td className="px-5 py-3"><p className="text-white font-semibold">{m.title}</p><p className="text-xs text-[#8A8A96]">{m.director}</p></td>
                                        <td className="px-3 py-3 text-xs text-[#8A8A96]">{emailFor(m) || <span className="text-[#FFC53D]">No email on file</span>}</td>
                                        <td className="px-5 py-3 text-right"><Button size="sm" variant="primary" accent="violet" onClick={() => setOnboarding(m)}>Send agreements</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </section>
            )}

            <section>
                <SectionTitle title="Agreements" hint="Preview one, or send it for signature." />
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {CONTRACT_TEMPLATES.map(t => (
                        <Card key={t.id}>
                            <div className="flex items-center justify-between gap-2">
                                <Pill accent={AUDIENCE_LABEL[t.audience].accent}>{AUDIENCE_LABEL[t.audience].label}</Pill>
                                <span className="text-xs text-[#5A5A66]">v{t.version} · {signedCountFor(t.id)} signed</span>
                            </div>
                            <p className="text-white font-bold mt-3">{t.title}</p>
                            <p className="text-sm text-[#A1A1AD] mt-1 min-h-[40px]">{t.summary}</p>
                            <div className="flex gap-2 mt-4">
                                <Button size="sm" onClick={() => setPreviewing(t)}>Preview</Button>
                                {t.id === 'actor-portal'
                                    ? <span className="text-xs text-[#8A8A96] self-center">Signed automatically when actors sign up</span>
                                    : <Button size="sm" variant="primary" accent="violet" onClick={() => setSending(t)}>Send</Button>}
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            <section>
                <SectionTitle
                    title="Tracker"
                    hint="Every agreement you've sent."
                    right={<div className="flex flex-wrap gap-2">
                        <input className={`${inputClass} w-48`} placeholder="Search people or films…" value={query} onChange={e => setQuery(e.target.value)} />
                        {(['all', 'sent', 'signed', 'void'] as const).map(f => (
                            <Button key={f} size="sm" variant={filter === f ? 'primary' : 'ghost'} accent="violet" onClick={() => setFilter(f)}>
                                {f === 'all' ? 'All' : f === 'sent' ? 'Waiting' : f === 'signed' ? 'Signed' : 'Withdrawn'}
                            </Button>
                        ))}
                    </div>}
                />
                <Card padded={false} className="overflow-hidden">
                    {loading ? <p className="p-6 text-[#8A8A96]">Loading…</p> : shown.length === 0 ? (
                        <div className="p-6"><EmptyState icon="✍️" title={requests.length ? 'Nothing matches' : 'No agreements sent yet'} text={requests.length ? undefined : 'Send your first agreement — a Filmmaker Distribution Agreement is a great place to start.'} /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-[#8A8A96] border-b border-white/[0.07]">
                                    <th className="px-5 py-3 font-semibold">Person</th><th className="px-3 py-3 font-semibold">Agreement</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Sent</th><th className="px-5 py-3 font-semibold text-right">Actions</th>
                                </tr></thead>
                                <tbody>
                                    {shown.map(r => (
                                        <tr key={r.token} className="border-b border-white/[0.04]">
                                            <td className="px-5 py-3"><p className="text-white font-semibold">{r.recipientName}</p><p className="text-xs text-[#8A8A96]">{r.recipientEmail}</p></td>
                                            <td className="px-3 py-3"><p className="text-white">{r.templateTitle}</p>{r.filmTitle && <p className="text-xs text-[#8A8A96]">{r.filmTitle}{r.filmmakerPercent != null && r.templateId === 'filmmaker-distribution' ? ` · ${r.filmmakerPercent}/${Math.round((100 - r.filmmakerPercent) * 100) / 100}` : ''}</p>}</td>
                                            <td className="px-3 py-3">{r.status === 'signed' ? <Pill accent="green">Signed {shortDate(r.signedAt)}</Pill> : r.status === 'void' ? <Pill>Withdrawn</Pill> : <Pill accent="amber">Waiting</Pill>}</td>
                                            <td className="px-3 py-3 text-[#A1A1AD]">{shortDate(r.lastSentAt || r.createdAt)}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end gap-1.5">
                                                    {r.status === 'signed' && r.signatureId && <Button size="sm" onClick={() => setViewing(r.signatureId!)}>View</Button>}
                                                    {r.status === 'sent' && <>
                                                        <Button size="sm" variant="ghost" onClick={async () => { if (await copyText(r.link)) flash('Link copied.'); }}>Copy link</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => act('admin-resend', r.token)}>Remind</Button>
                                                        <Button size="sm" variant="danger" onClick={() => act('admin-void', r.token)}>Withdraw</Button>
                                                    </>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </section>

            {otherSignatures.length > 0 && (
                <section>
                    <SectionTitle title="Accepted at signup" hint="Actors accept the Actor Portal Agreement when they submit their profile." />
                    <Card padded={false} className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                    {otherSignatures.map(s => (
                                        <tr key={s.id} className="border-b border-white/[0.04]">
                                            <td className="px-5 py-3"><p className="text-white font-semibold">{s.signerName}</p><p className="text-xs text-[#8A8A96]">{s.signerEmail}</p></td>
                                            <td className="px-3 py-3 text-white">{s.templateTitle}</td>
                                            <td className="px-3 py-3 text-[#A1A1AD]">{shortDate(s.signedAt)}</td>
                                            <td className="px-5 py-3 text-right"><Button size="sm" onClick={() => setViewing(s.id)}>View</Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </section>
            )}

            <section>
                <SectionTitle title="Uploaded documents" hint="Paper contracts, W-9s and anything signed outside CRATE. Stored privately; links expire after 5 minutes." />
                <div className="rounded-3xl bg-[#131318] border border-white/[0.07] p-5 md:p-6"><ContractsTab /></div>
            </section>

            {sending && <SendDialog template={sending} movies={Object.values(movies)} onClose={() => setSending(null)} onSent={load} />}
            {previewing && <PreviewDialog template={previewing} onClose={() => setPreviewing(null)} onSend={() => { setSending(previewing); setPreviewing(null); }} />}
            {viewing && <SignedCopyDialog id={viewing} onClose={() => setViewing(null)} />}
            {onboarding && <OnboardDialog movie={onboarding} email={emailFor(onboarding)} onClose={() => setOnboarding(null)} onSent={() => { flash(`Agreements sent for “${onboarding.title}”.`); setOnboarding(null); load(); }} />}
        </div>
    );
};

export default ContractsCenterTab;
