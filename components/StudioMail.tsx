import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getDbInstance } from '../services/firebaseClient';
import { useFestival } from '../contexts/FestivalContext';
import LoadingSpinner from './LoadingSpinner';

// One row in either folder. Messages from the website forms, film submissions and
// real emails all end up in this same shape.
interface MailItem {
    id: string;
    folder: 'in' | 'out';
    kind: 'EMAIL' | 'CONTACT' | 'INQUIRY' | 'SUBMISSION' | 'SENT';
    name: string;
    email: string;
    subject: string;
    text: string;
    when: number;
    unread: boolean;
    attachments: { filename: string; size?: number }[];
    canOpenOriginal?: boolean;
}

const MAX_TOTAL_BYTES = 3_000_000;
const MAX_FILES = 5;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx';

const toMs = (v: any): number => {
    if (!v) return 0;
    if (typeof v === 'string') return Date.parse(v) || 0;
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (typeof v.toMillis === 'function') return v.toMillis();
    return 0;
};
const sizeLabel = (n?: number) => !n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const dateLabel = (ms: number) => {
    if (!ms) return '';
    const d = new Date(ms), now = new Date();
    return d.toDateString() === now.toDateString()
        ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
};
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const readAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsDataURL(file);
});

const KIND_LABEL: Record<MailItem['kind'], string> = {
    EMAIL: 'Email', CONTACT: 'Contact form', INQUIRY: 'Talent inquiry', SUBMISSION: 'Film submission', SENT: 'Sent',
};

const StudioMail: React.FC = () => {
    const { settings } = useFestival();
    const [folder, setFolder] = useState<'in' | 'out'>('in');
    const [received, setReceived] = useState<MailItem[]>([]);
    const [sent, setSent] = useState<MailItem[]>([]);
    const [mailboxNote, setMailboxNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<MailItem | null>(null);
    const [isNewCompose, setIsNewCompose] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    const [replyText, setReplyText] = useState('');
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const fileInput = useRef<HTMLInputElement>(null);

    const fromAddress = settings.businessEmail || 'studio@cratetv.net';
    const adminKey = () => sessionStorage.getItem('adminPassword');

    const callMail = useCallback(async (payload: Record<string, unknown>) => {
        const res = await fetch('/api/admin-mail', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminKey(), ...payload }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load the mailbox.');
        return data;
    }, []);

    const loadAll = useCallback(async () => {
        setIsLoading(true);
        const incoming: MailItem[] = [];

        // 1. Messages from the website (contact form, talent inquiries, film submissions).
        try {
            const db = getDbInstance();
            if (db) {
                const [contacts, inquiries, pipeline] = await Promise.all([
                    db.collection('security_events').where('type', 'in', ['CONTACT_SENT', 'SUBMISSION_RECEIVED']).orderBy('timestamp', 'desc').limit(30).get(),
                    db.collection('talent_inquiries').orderBy('timestamp', 'desc').limit(20).get(),
                    db.collection('movie_pipeline').orderBy('submissionDate', 'desc').limit(20).get(),
                ]);
                contacts.forEach(doc => {
                    const d: any = doc.data();
                    if (d.type !== 'CONTACT_SENT') return;
                    incoming.push({ id: doc.id, folder: 'in', kind: 'CONTACT', name: d.details?.name || 'Visitor', email: d.details?.email || '', subject: 'Message from the contact form', text: d.details?.message || '', when: toMs(d.timestamp), unread: false, attachments: [] });
                });
                inquiries.forEach(doc => {
                    const d: any = doc.data();
                    incoming.push({ id: doc.id, folder: 'in', kind: 'INQUIRY', name: d.senderName || 'Someone', email: d.senderEmail || '', subject: `Talent inquiry: ${d.actorName || ''}`, text: d.message || '', when: toMs(d.timestamp), unread: false, attachments: [] });
                });
                pipeline.forEach(doc => {
                    const d: any = doc.data();
                    incoming.push({ id: doc.id, folder: 'in', kind: 'SUBMISSION', name: d.director || 'Filmmaker', email: d.submitterEmail || '', subject: `Film submission: ${d.title || ''}`, text: `Title: ${d.title}\nDirector: ${d.director}\nLink: ${d.movieUrl}\n\n${d.synopsis || ''}`, when: toMs(d.submissionDate), unread: false, attachments: [] });
                });
            }
        } catch (e) { console.error('Website messages failed to load', e); }

        // 2. Real emails people sent to the mailbox, and your Sent copies.
        const outgoing: MailItem[] = [];
        try {
            const [inbox, outbox] = await Promise.all([callMail({ action: 'list', folder: 'in' }), callMail({ action: 'list', folder: 'out' })]);
            (inbox.messages || []).forEach((m: any) => incoming.push({
                id: m.id, folder: 'in', kind: 'EMAIL', name: m.fromName || m.fromEmail || 'Unknown', email: m.fromEmail || '', subject: m.subject || '(no subject)',
                text: m.text || '', when: toMs(m.createdAt), unread: m.read === false, attachments: m.attachments || [], canOpenOriginal: true,
            }));
            (outbox.messages || []).forEach((m: any) => outgoing.push({
                id: m.id, folder: 'out', kind: 'SENT', name: (m.to || [])[0] || '', email: (m.to || [])[0] || '', subject: m.subject || '(no subject)',
                text: m.text || '', when: toMs(m.createdAt), unread: false, attachments: m.attachments || [],
            }));
            setMailboxNote('');
        } catch (e) {
            setMailboxNote(e instanceof Error ? e.message : 'Could not load the mailbox.');
        }

        setReceived(incoming.sort((a, b) => b.when - a.when));
        setSent(outgoing.sort((a, b) => b.when - a.when));
        setIsLoading(false);
    }, [callMail]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const list = folder === 'in' ? received : sent;
    const unreadCount = useMemo(() => received.filter(m => m.unread).length, [received]);

    const resetComposer = () => { setReplyText(''); setFiles([]); if (fileInput.current) fileInput.current.value = ''; };

    const openMessage = (m: MailItem) => {
        setIsNewCompose(false); setNotice(null); setSelected(m);
        setRecipient(m.folder === 'in' ? m.email : ''); setSubject(m.folder === 'in' ? (/^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`) : '');
        resetComposer();
        if (m.kind === 'EMAIL' && m.unread) {
            callMail({ action: 'markRead', id: m.id }).catch(() => {});
            setReceived(prev => prev.map(x => x.id === m.id ? { ...x, unread: false } : x));
        }
    };

    const startCompose = () => { setFolder('out'); setSelected(null); setIsNewCompose(true); setNotice(null); setRecipient(''); setSubject(''); resetComposer(); };

    const addFiles = (picked: FileList | null) => {
        if (!picked) return;
        const next = [...files, ...Array.from(picked)];
        const total = next.reduce((n, f) => n + f.size, 0);
        if (next.length > MAX_FILES) { setNotice({ ok: false, text: `Up to ${MAX_FILES} files per email.` }); return; }
        if (total > MAX_TOTAL_BYTES) { setNotice({ ok: false, text: 'Those files are too big together. Keep the total under 3 MB (a receipt as a PDF is fine).' }); return; }
        setNotice(null); setFiles(next);
        if (fileInput.current) fileInput.current.value = '';
    };

    const handleDraft = async () => {
        setIsDrafting(true); setNotice(null);
        try {
            const res = await fetch('/api/draft-studio-reply', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminKey(), context: selected ? selected.text : 'General studio update', senderName: selected?.name, type: selected?.kind === 'EMAIL' ? 'GENERAL' : selected?.kind || 'GENERAL' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setReplyText(data.draft);
        } catch { setNotice({ ok: false, text: 'The writing helper could not draft that right now. You can write it yourself.' }); }
        finally { setIsDrafting(false); }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true); setNotice(null);
        try {
            const attachments = await Promise.all(files.map(async f => ({ filename: f.name, content: await readAsBase64(f) })));
            const res = await fetch('/api/send-individual-email', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminKey(), email: recipient.trim(), subject, htmlBody: escapeHtml(replyText).replace(/\n/g, '<br/>'), attachments }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'The email did not send.');
            setNotice({ ok: true, text: `Sent to ${recipient.trim()}. A copy is in your Sent folder.` });
            resetComposer(); setIsNewCompose(false); setSelected(null);
            await loadAll(); setFolder('out');
        } catch (err) {
            setNotice({ ok: false, text: err instanceof Error ? err.message : 'The email did not send.' });
        } finally { setIsSending(false); }
    };

    const openOriginal = async () => {
        if (!selected) return;
        try { const { url } = await callMail({ action: 'original', id: selected.id }); window.open(url, '_blank', 'noopener'); }
        catch (err) { setNotice({ ok: false, text: err instanceof Error ? err.message : 'Could not open the original.' }); }
    };

    const showComposer = isNewCompose || (selected && selected.folder === 'in');

    return (
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[650px]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white/5 border border-white/10 p-4 rounded-2xl">
                <p className="text-sm text-gray-300">Sending as <span className="font-bold text-white">{fromAddress}</span></p>
                <div className="flex gap-2">
                    <button onClick={loadAll} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10">Refresh</button>
                    <button onClick={startCompose} className="px-5 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700">+ New email</button>
                </div>
            </div>

            {mailboxNote && <p className="mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">{mailboxNote}</p>}
            {notice && <p className={`mb-4 text-xs rounded-xl px-4 py-3 border ${notice.ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-red-300 bg-red-500/10 border-red-500/20'}`}>{notice.text}</p>}

            <div className="flex-grow flex flex-col lg:flex-row gap-5 overflow-hidden">
                {/* List */}
                <div className="lg:w-96 flex flex-col bg-[#0f0f0f] border border-white/5 rounded-3xl overflow-hidden min-h-[260px]">
                    <div className="flex border-b border-white/5">
                        {([['in', 'Received'], ['out', 'Sent']] as const).map(([key, label]) => (
                            <button key={key} onClick={() => { setFolder(key); setSelected(null); setIsNewCompose(false); }}
                                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-colors ${folder === key ? 'text-white border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-300'}`}>
                                {label}{key === 'in' && unreadCount > 0 && <span className="ml-2 bg-red-600 text-white rounded-full px-2 py-0.5 text-[10px]">{unreadCount}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {isLoading ? <div className="p-10 text-center"><LoadingSpinner /></div> : list.length === 0 ? (
                            <p className="p-10 text-center text-sm text-gray-500">{folder === 'in' ? 'Nothing received yet.' : 'Nothing sent yet. Emails you send from here show up in this folder.'}</p>
                        ) : list.map(m => (
                            <button key={m.id} onClick={() => openMessage(m)}
                                className={`w-full text-left px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] ${selected?.id === m.id ? 'bg-red-600/5' : ''}`}>
                                <div className="flex justify-between gap-3 mb-1">
                                    <span className={`truncate text-sm ${m.unread ? 'font-black text-white' : 'font-bold text-gray-300'}`}>
                                        {m.unread && <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2 align-middle" />}{m.name || m.email}
                                    </span>
                                    <span className="text-[11px] text-gray-600 whitespace-nowrap">{dateLabel(m.when)}</span>
                                </div>
                                <p className="truncate text-xs text-gray-400">{m.subject}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{KIND_LABEL[m.kind]}</span>
                                    {m.attachments.length > 0 && <span className="text-[10px] text-gray-500">📎 {m.attachments.length}</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reading / writing */}
                <div className="flex-grow bg-[#0f0f0f] border border-white/5 rounded-3xl flex flex-col overflow-hidden min-h-[420px]">
                    {!selected && !isNewCompose ? (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-600 p-8 gap-2">
                            <p className="text-sm font-bold uppercase tracking-widest">Pick a message, or start a new email</p>
                            <p className="text-xs max-w-sm">Replies to emails you send from here land in Received once the mailbox is connected (see the setup steps your assistant gave you).</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="flex flex-col h-full">
                            <div className="p-6 border-b border-white/5">
                                {isNewCompose ? (
                                    <div className="space-y-3">
                                        <input value={recipient} onChange={e => setRecipient(e.target.value)} type="email" required placeholder="To: email@address.com" className="w-full bg-transparent text-lg font-bold text-white focus:outline-none placeholder:text-gray-700" />
                                        <input value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Subject" className="w-full bg-transparent text-sm text-gray-300 focus:outline-none placeholder:text-gray-700" />
                                    </div>
                                ) : selected && (
                                    <div>
                                        <h2 className="text-2xl font-black text-white">{selected.subject}</h2>
                                        <p className="text-sm text-gray-400 mt-1">{selected.folder === 'in' ? 'From' : 'To'} {selected.name && selected.name !== selected.email ? `${selected.name} · ` : ''}{selected.email} · {selected.when ? new Date(selected.when).toLocaleString() : ''}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                                {selected && (
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                        <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">{selected.text || '(No message text.)'}</p>
                                        {selected.attachments.length > 0 && (
                                            <div className="mt-5 pt-4 border-t border-white/10">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Attachments</p>
                                                <ul className="space-y-1">
                                                    {selected.attachments.map((a, i) => <li key={i} className="text-sm text-gray-300">📎 {a.filename} <span className="text-gray-600">{sizeLabel(a.size)}</span></li>)}
                                                </ul>
                                                {selected.canOpenOriginal && <button type="button" onClick={openOriginal} className="mt-3 text-xs font-bold text-red-400 hover:text-red-300 underline">Download the original email with its attachments</button>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {showComposer && (
                                    <div className="space-y-4">
                                        {!isNewCompose && selected?.folder === 'in' && (
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="font-bold uppercase tracking-widest">Reply to</span>
                                                <input value={recipient} onChange={e => setRecipient(e.target.value)} type="email" required className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-gray-200 flex-grow" />
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Your message</label>
                                            <button type="button" onClick={handleDraft} disabled={isDrafting} className="text-xs font-bold text-indigo-300 bg-indigo-600/10 border border-indigo-500/20 rounded-lg px-3 py-1.5 hover:bg-indigo-600/20">
                                                {isDrafting ? 'Writing…' : '✨ Help me write this'}
                                            </button>
                                        </div>
                                        <textarea value={replyText} onChange={e => setReplyText(e.target.value)} required placeholder="Write your message…" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-gray-200 min-h-[220px] focus:border-red-600 focus:outline-none leading-relaxed text-sm" />

                                        <div>
                                            <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={e => addFiles(e.target.files)} />
                                            <button type="button" onClick={() => fileInput.current?.click()} className="text-xs font-bold text-gray-200 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 hover:bg-white/10">📎 Attach files (receipts, PDFs, pictures)</button>
                                            <span className="ml-3 text-[11px] text-gray-600">Up to {MAX_FILES} files, 3 MB total</span>
                                            {files.length > 0 && (
                                                <ul className="mt-3 space-y-1.5">
                                                    {files.map((f, i) => (
                                                        <li key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200">
                                                            <span className="truncate">📎 {f.name} <span className="text-gray-600">{sizeLabel(f.size)}</span></span>
                                                            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 text-xs font-bold ml-3">Remove</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {showComposer && (
                                <div className="p-5 border-t border-white/5 flex items-center justify-between gap-4">
                                    <p className="text-[11px] text-gray-600">{settings.emailSignature ? 'Your signature is added automatically.' : ''}</p>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => { setSelected(null); setIsNewCompose(false); resetComposer(); }} className="px-5 py-3 text-xs font-bold text-gray-500 hover:text-white">Discard</button>
                                        <button type="submit" disabled={isSending || !replyText || !recipient} className="bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-black px-8 py-3 rounded-xl text-xs uppercase tracking-widest">
                                            {isSending ? 'Sending…' : 'Send email'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudioMail;
