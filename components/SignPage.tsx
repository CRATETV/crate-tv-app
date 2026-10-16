import React, { useEffect, useMemo, useState } from 'react';
import SEO from './SEO';
import ContractText from './ContractText';

// /sign?t=<token> — review and sign a CRATE agreement, or view the signed copy.
// The page is printable: "Print or save as PDF" gives a clean paper copy.

interface Loaded {
    status: 'awaiting' | 'signed';
    template: { id: string; title: string; version: string };
    text: string;
    recipientName?: string;
    recipientEmailMasked?: string;
    filmTitle?: string | null;
    signature?: { signerName: string; typedSignature: string; signedAt: string | null; fingerprint: string } | null;
}

async function sha256(text: string): Promise<string> {
    try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch { return ''; }
}

const SignPage: React.FC = () => {
    const token = useMemo(() => new URLSearchParams(window.location.search).get('t') || '', []);
    const [data, setData] = useState<Loaded | null>(null);
    const [error, setError] = useState('');
    const [typedName, setTypedName] = useState('');
    const [email, setEmail] = useState('');
    const [agree, setAgree] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const load = async () => {
        setError('');
        try {
            const res = await fetch(`/api/contracts?token=${encodeURIComponent(token)}`);
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'This signing link is not valid.');
            setData(d);
        } catch (e) { setError(e instanceof Error ? e.message : 'This signing link is not valid.'); }
    };
    useEffect(() => { if (token) load(); else setError('This signing link is missing its code. Open the link from your email again.'); }, [token]);

    const sign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data) return;
        setSubmitting(true); setSubmitError('');
        try {
            const res = await fetch('/api/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sign', token, typedName, email, agree, fingerprint: await sha256(data.text) }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Could not sign. Please try again.');
            await load();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) { setSubmitError(err instanceof Error ? err.message : 'Could not sign.'); }
        finally { setSubmitting(false); }
    };

    const signedAt = data?.signature?.signedAt ? new Date(data.signature.signedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : '';

    return (
        <div className="min-h-screen bg-[#0B0B0D] print:bg-white py-8 md:py-14 px-4">
            <SEO title={data ? `${data.template.title} — CRATE TV` : 'Sign an agreement — CRATE TV'} description="Review and sign your CRATE TV agreement." />
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <a href="/" className="text-white font-black tracking-tight text-xl">CRATE<span className="text-[#FF3B5C]">.</span></a>
                    {data && <button onClick={() => window.print()} className="text-sm font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl">Print or save as PDF</button>}
                </div>

                {error && (
                    <div className="bg-white rounded-3xl p-8 text-center">
                        <p className="text-2xl mb-2" aria-hidden>📄</p>
                        <p className="text-gray-900 font-bold text-lg">{error}</p>
                        <p className="text-gray-500 mt-2 text-sm">Need help? Email <a className="underline" href="mailto:studiocrate@gmail.com">studiocrate@gmail.com</a>.</p>
                    </div>
                )}

                {!error && !data && <div className="text-center text-white/60 py-24">Loading your agreement…</div>}

                {data && (
                    <article className="bg-white rounded-3xl print:rounded-none shadow-2xl print:shadow-none overflow-hidden">
                        {data.status === 'signed' && (
                            <div className="bg-[#1FCB7A] text-[#062915] px-6 md:px-10 py-4 font-bold print:bg-white print:border-b print:border-gray-300">
                                ✓ Signed{data.signature ? ` by ${data.signature.signerName}` : ''}{signedAt ? ` on ${signedAt}` : ''}
                            </div>
                        )}
                        <div className="px-6 md:px-12 py-8 md:py-12">
                            <p className="text-xs font-bold tracking-widest text-[#FF3B5C] uppercase">CRATE TV agreement · version {data.template.version}</p>
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 tracking-tight">{data.template.title}</h1>
                            {data.filmTitle && <p className="text-gray-500 mt-1">for <span className="text-gray-900 font-semibold">{data.filmTitle}</span></p>}
                            {data.status === 'awaiting' && (
                                <p className="mt-5 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-2xl p-4 print:hidden">
                                    Please read the whole agreement. When you're ready, sign at the bottom by typing your name. You'll get a copy by email.
                                </p>
                            )}
                            <div className="mt-6">
                                <ContractText text={data.text} />
                            </div>

                            {data.status === 'signed' && ['filmmaker-distribution', 'rights-warranty', 'festival-submission'].includes(data.template.id) && (
                                <div className="mt-8 rounded-2xl bg-green-50 border border-green-200 p-5 print:hidden">
                                    <p className="font-black text-green-800">Next: get paid</p>
                                    <p className="text-sm text-green-900 mt-1">Set up your free filmmaker dashboard to see views and earnings, and choose how you want to be paid. Use your name exactly as it appears in your film's credits.</p>
                                    <a href="/filmmaker-signup" className="inline-block mt-3 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm">Set up my dashboard</a>
                                </div>
                            )}
                            {data.status === 'signed' && data.signature && (
                                <div className="mt-10 border-t-2 border-gray-900 pt-6 grid md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Signed by</p>
                                        <p className="text-3xl text-gray-900 mt-2" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>{data.signature.typedSignature}</p>
                                        <p className="text-sm text-gray-600 mt-1">{data.signature.signerName}</p>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p><span className="font-bold text-gray-900">Date:</span> {signedAt}</p>
                                        <p><span className="font-bold text-gray-900">For CRATE TV:</span> accepted electronically</p>
                                        <p className="text-xs text-gray-400 break-all">Document fingerprint (SHA-256): {data.signature.fingerprint}</p>
                                    </div>
                                </div>
                            )}

                            {data.status === 'awaiting' && (
                                <form onSubmit={sign} className="mt-10 border-t-2 border-gray-900 pt-8 space-y-5 print:hidden">
                                    <h2 className="text-xl font-black text-gray-900">Sign</h2>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <label className="block">
                                            <span className="text-sm font-semibold text-gray-700">Type your full name</span>
                                            <input value={typedName} onChange={e => setTypedName(e.target.value)} autoComplete="name" placeholder={data.recipientName}
                                                className="mt-1 w-full border-2 border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-2xl text-gray-900 outline-none"
                                                style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }} />
                                        </label>
                                        <label className="block">
                                            <span className="text-sm font-semibold text-gray-700">Your email</span>
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder={data.recipientEmailMasked}
                                                className="mt-1 w-full border-2 border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-gray-900 outline-none" />
                                            <span className="text-xs text-gray-500 mt-1 block">The address this was sent to ({data.recipientEmailMasked}).</span>
                                        </label>
                                    </div>
                                    <label className="flex items-start gap-3 text-sm text-gray-700">
                                        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1 w-5 h-5" />
                                        <span>I've read this agreement, I agree to it, and I agree that typing my name above is my electronic signature.</span>
                                    </label>
                                    {submitError && <p className="text-[#C81E3A] text-sm font-semibold" role="alert">{submitError}</p>}
                                    <button type="submit" disabled={submitting || !agree || typedName.trim().length < 2 || !email}
                                        className="w-full md:w-auto bg-gray-900 text-white font-black px-10 py-4 rounded-2xl disabled:opacity-30 hover:bg-black">
                                        {submitting ? 'Signing…' : 'Sign agreement'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </article>
                )}
            </div>
        </div>
    );
};

export default SignPage;
