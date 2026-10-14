// "Need help?" button for festival pages and watch parties.
//
// Fixes the common problems on the spot (see api/festival-help.ts) and sends
// everything else to CRATE with the viewer's ticket details attached.
import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFestival } from '../contexts/FestivalContext';
import type { FilmBlock } from '../types';
import { isOutsidePartner } from '../api/_lib/partnerRules';

type View = 'menu' | 'ticket' | 'playback' | 'schedule' | 'email' | 'report';
type Category = 'ticket' | 'playback' | 'schedule' | 'email' | 'other';

interface CheckResult {
    signedInAs: string;
    fixedCount: number;
    otherAccount: { email: string; tickets: number } | null;
    tickets: { label: string; status: string; statusText: string; startsAt: string | null; link: string | null }[];
}

async function callHelp<T>(body: Record<string, unknown>): Promise<T> {
    const res = await fetch('/api/festival-help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
}

const btn = 'w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white transition-colors';
const primary = 'px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50';
const ghost = 'px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold';
const input = 'w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500';

const STATUS_COLOR: Record<string, string> = { ok: 'text-emerald-400', fixed: 'text-emerald-300', ended: 'text-gray-400', refunded: 'text-amber-300', 'needs-person': 'text-amber-300' };

const localTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
function countdown(iso: string, now: number): string {
    const ms = Date.parse(iso) - now;
    if (ms <= 0) return ms > -3 * 60 * 60 * 1000 ? 'started' : 'already screened';
    const h = Math.floor(ms / 3_600_000), d = Math.floor(h / 24);
    if (d >= 1) return `in ${d} day${d > 1 ? 's' : ''}`;
    if (h >= 1) return `in ${h} hr ${Math.floor((ms % 3_600_000) / 60_000)} min`;
    return `in ${Math.max(1, Math.floor(ms / 60_000))} min`;
}

const SignInFirst: React.FC = () => (
    <div className="space-y-3">
        <p className="text-sm text-gray-300">Please sign in first. Your tickets are saved to your Crate TV account.</p>
        <a className={primary + ' inline-block'} href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}>Sign in</a>
        <p className="text-[12px] text-gray-500">Use the same email you paid with.</p>
    </div>
);

/** placement 'top' keeps the button clear of video controls and chat on the watch party page. */
const FestivalHelpButton: React.FC<{ blocks?: FilmBlock[]; placement?: 'bottom' | 'top' }> = ({ blocks, placement = 'bottom' }) => {
    const { user, getUserIdToken, hasFestivalAllAccess, unlockedFestivalBlockIds } = useAuth();
    const { pwffFestivalData } = useFestival();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<View>('menu');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [check, setCheck] = useState<CheckResult | null>(null);
    const [otherEmail, setOtherEmail] = useState('');
    const [emailNote, setEmailNote] = useState('');
    const [reportCategory, setReportCategory] = useState<Category>('other');
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState('');
    const [reference, setReference] = useState('');

    const scheduleBlocks = useMemo(() => {
        const list = blocks || pwffFestivalData.flatMap(d => d.blocks || []);
        const now = Date.now();
        return list
            .filter(b => b.screeningStartTime || b.watchPartyStartTime)
            .map(b => ({ b, at: String(b.screeningStartTime || b.watchPartyStartTime) }))
            .filter(x => Date.parse(x.at) > now - 3 * 60 * 60 * 1000)
            .sort((x, y) => Date.parse(x.at) - Date.parse(y.at))
            .slice(0, 12);
    }, [blocks, pwffFestivalData]);

    const go = (v: View) => { setErr(''); setView(v); };
    const reset = () => { setView('menu'); setErr(''); setCheck(null); setEmailNote(''); setReference(''); setOtherEmail(''); };
    const toReport = (c: Category, prefill = '') => { setReportCategory(c); if (prefill && !message) setMessage(prefill); go('report'); };

    const runCheck = async (withOther?: string) => {
        setBusy(true); setErr('');
        try {
            const idToken = await getUserIdToken();
            setCheck(await callHelp<CheckResult>({ action: 'check', idToken, otherEmail: withOther || undefined }));
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    const resendTickets = async () => {
        setBusy(true); setErr(''); setEmailNote('');
        try {
            const idToken = await getUserIdToken();
            const r = await callHelp<{ sent: boolean; to?: string; message?: string }>({ action: 'resend', idToken });
            setEmailNote(r.sent ? `Sent to ${r.to}. It can take a few minutes — check your spam or promotions folder too.` : (r.message || 'No tickets found.'));
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };
    const sendReport = async () => {
        setBusy(true); setErr('');
        try {
            const idToken = user ? await getUserIdToken() : undefined;
            const r = await callHelp<{ reference: string }>({
                action: 'report', idToken, contactEmail: contact || user?.email, category: reportCategory, message,
                page: window.location.pathname, userAgent: navigator.userAgent,
            });
            setReference(r.reference);
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
    };

    const hasTicketFor = (b: FilmBlock) => (hasFestivalAllAccess && !isOutsidePartner(b.partnerId)) || unlockedFestivalBlockIds.has(b.id) || !b.price;

    return (
        <>
            <button type="button" onClick={() => { setOpen(o => !o); if (open) reset(); }}
                className={placement === 'top'
                    ? 'fixed top-16 right-3 z-[600] flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/70 backdrop-blur border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black/90'
                    : 'fixed bottom-24 md:bottom-20 right-4 z-[600] flex items-center gap-2 px-4 py-3 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform'}
                aria-expanded={open} aria-label="Need help?">
                <span aria-hidden>?</span> {open ? 'Close' : placement === 'top' ? 'Help' : 'Need help?'}
            </button>
            {open && (
                <div role="dialog" aria-label="Festival help"
                    className={`fixed ${placement === 'top' ? 'top-28' : 'bottom-40 md:bottom-36'} right-4 z-[600] w-[calc(100vw-2rem)] max-w-sm max-h-[75vh] overflow-y-auto rounded-2xl bg-[#111] border border-white/15 shadow-2xl p-5 text-white`}>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Festival help</p>
                        {view !== 'menu' && <button type="button" className="text-xs text-gray-400 hover:text-white" onClick={reset}>← Back</button>}
                    </div>

                    {view === 'menu' && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-300 mb-3">What’s going on?</p>
                            <button type="button" className={btn} onClick={() => { go('ticket'); if (user) runCheck(); }}>🎟️ I bought a ticket but can’t get in</button>
                            <button type="button" className={btn} onClick={() => go('playback')}>▶️ The film won’t play</button>
                            <button type="button" className={btn} onClick={() => go('schedule')}>🕒 When does it start? Where do I watch?</button>
                            <button type="button" className={btn} onClick={() => go('email')}>✉️ I didn’t get my ticket email</button>
                            <button type="button" className={btn} onClick={() => toReport('other')}>💬 Something else</button>
                        </div>
                    )}

                    {view === 'ticket' && (!user ? <SignInFirst /> : (
                        <div className="space-y-4">
                            {busy && !check && <p className="text-sm text-gray-400">Checking your tickets…</p>}
                            {check && (
                                <>
                                    <p className="text-[12px] text-gray-500">Signed in as <strong className="text-gray-300">{check.signedInAs}</strong></p>
                                    {check.fixedCount > 0 && (
                                        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                                            <p className="text-sm font-bold text-emerald-300">Fixed! We restored {check.fixedCount} ticket{check.fixedCount > 1 ? 's' : ''}.</p>
                                            <button type="button" className={primary + ' mt-2'} onClick={() => window.location.reload()}>Reload the page</button>
                                        </div>
                                    )}
                                    {check.tickets.length > 0 ? (
                                        <ul className="space-y-2">
                                            {check.tickets.map((t, i) => (
                                                <li key={i} className="rounded-xl bg-white/5 p-3">
                                                    <p className="text-sm font-bold">{t.label}</p>
                                                    <p className={`text-[12px] ${STATUS_COLOR[t.status] || 'text-gray-400'}`}>{t.statusText}</p>
                                                    {t.startsAt && <p className="text-[12px] text-gray-400">{localTime(t.startsAt)}</p>}
                                                    {t.link && (t.status === 'ok' || t.status === 'fixed') && <a href={t.link} className="text-[12px] text-red-400 underline">Go to it →</a>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-300">We didn’t find any tickets on this account.</p>
                                    )}
                                    {check.otherAccount && (
                                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-100">
                                            Found it: {check.otherAccount.tickets} ticket{check.otherAccount.tickets > 1 ? 's are' : ' is'} on the account <strong>{check.otherAccount.email}</strong>. Sign out, then sign in with that email to watch.
                                        </div>
                                    )}
                                    {!check.otherAccount && (
                                        <div className="space-y-2">
                                            <p className="text-[12px] text-gray-400">Paid with a different email? Enter it and we’ll look.</p>
                                            <div className="flex gap-2">
                                                <input className={input} type="email" value={otherEmail} onChange={e => setOtherEmail(e.target.value)} placeholder="email you paid with" />
                                                <button type="button" className={ghost} disabled={busy || !otherEmail.trim()} onClick={() => runCheck(otherEmail.trim())}>Check</button>
                                            </div>
                                        </div>
                                    )}
                                    <button type="button" className="text-[12px] text-gray-400 underline" onClick={() => toReport('ticket')}>Still stuck? Send it to Crate TV</button>
                                </>
                            )}
                        </div>
                    ))}

                    {view === 'playback' && (
                        <div className="space-y-3 text-sm text-gray-300">
                            <p>Try these in order. Most problems clear up at step 1 or 2.</p>
                            <ol className="list-decimal pl-5 space-y-2">
                                <li><button type="button" className="underline text-white" onClick={() => window.location.reload()}>Reload the page</button>. It gets a fresh video link and rejoins the watch party at the right moment.</li>
                                <li>Check that you’re signed in with the email you bought your ticket with.</li>
                                <li>Use an up-to-date Chrome, Safari or Edge. Close other tabs that are playing video.</li>
                                <li>Turn off VPNs and ad blockers for cratetv.net.</li>
                                <li>On a phone, move closer to Wi-Fi or switch between Wi-Fi and mobile data.</li>
                                <li>On a TV or smart device, watch on a phone or laptop for now and cast it.</li>
                            </ol>
                            <button type="button" className={ghost} onClick={() => toReport('playback', 'The film won’t play. ')}>Still not working? Send it to Crate TV</button>
                        </div>
                    )}

                    {view === 'schedule' && (
                        <div className="space-y-3">
                            <p className="text-[12px] text-gray-400">Times are shown in your time zone.</p>
                            {scheduleBlocks.length === 0 && <p className="text-sm text-gray-300">No upcoming screenings right now.</p>}
                            <ul className="space-y-2">
                                {scheduleBlocks.map(({ b, at }) => (
                                    <li key={b.id} className="rounded-xl bg-white/5 p-3">
                                        <p className="text-sm font-bold">{b.title}</p>
                                        <p className="text-[12px] text-gray-400">{localTime(at)} · {countdown(at, Date.now())}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <a href={`/watchparty/${b.id}`} className="text-[12px] text-red-400 underline">Go to the watch party →</a>
                                            {user && <span className={`text-[11px] ${hasTicketFor(b) ? 'text-emerald-400' : 'text-gray-500'}`}>{hasTicketFor(b) ? 'You’re in' : 'No ticket yet'}</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-[12px] text-gray-500">The watch party opens a few minutes early. You’ll also get an email 30 minutes before.</p>
                        </div>
                    )}

                    {view === 'email' && (!user ? <SignInFirst /> : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-300">We’ll email a list of your tickets, with times and links, to <strong className="text-white">{user.email}</strong>.</p>
                            <button type="button" className={primary} disabled={busy} onClick={resendTickets}>{busy ? 'Sending…' : 'Re-send my tickets'}</button>
                            {emailNote && <p className="text-sm text-emerald-300">{emailNote}</p>}
                            <p className="text-[12px] text-gray-500">You don’t need the email to watch. Your tickets are on your account: open <a href="/my-festival" className="underline">My Festival</a>.</p>
                        </div>
                    ))}

                    {view === 'report' && (reference ? (
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-emerald-300">Sent. Crate TV has your message.</p>
                            <p className="text-sm text-gray-300">We’ll reply by email. Your reference is <strong className="text-white">{reference}</strong>.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-300">Tell us what’s happening. We’ll see your tickets and device automatically, so you don’t need to explain those.</p>
                            <textarea className={`${input} min-h-[100px]`} value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} placeholder="What happened?" />
                            {!user && <input className={input} type="email" value={contact} onChange={e => setContact(e.target.value)} placeholder="Your email, so we can reply" />}
                            <button type="button" className={primary} disabled={busy || (!message.trim() && reportCategory === 'other') || (!user && !contact.trim())} onClick={sendReport}>{busy ? 'Sending…' : 'Send to Crate TV'}</button>
                        </div>
                    ))}

                    {err && <p className="text-sm text-red-400 mt-3">{err}</p>}
                </div>
            )}
        </>
    );
};

export default FestivalHelpButton;
