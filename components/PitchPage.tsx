import React, { useEffect, useState } from 'react';
import Header from './Header';
import CollapsibleFooter from './CollapsibleFooter';
import BackToTopButton from './BackToTopButton';
import BottomNavBar from './BottomNavBar';

// Two "come to us" pages (Oct 2026), so festivals and filmmakers can find
// CRATE and ask, instead of CRATE cold-emailing them:
//   /host      — HostFestivalPage: host your festival on CRATE
//   /premiere  — PremierePage: premiere your film on CRATE
// Both send to /api/send-inquiry, which emails the studio inbox.
//
// Only list things CRATE really does today. (No "DRM" or location lock
// claims: see the Oct 26 notes in CHANGELOG.md.)

type Kind = 'festival' | 'premiere';

interface Feature { icon: string; title: string; body: string }

const go = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('pushstate'));
};

const scrollToForm = () => document.getElementById('ask')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const Field: React.FC<{ label: string; name: string; type?: string; required?: boolean; placeholder?: string; maxLength?: number }> =
    ({ label, name, type = 'text', required, placeholder, maxLength = 150 }) => (
        <div>
            <label htmlFor={`f-${name}`} className="form-label">{label}{required && <span className="text-red-500"> *</span>}</label>
            <input id={`f-${name}`} name={name} type={type} required={required} placeholder={placeholder} maxLength={maxLength} className="form-input" />
        </div>
    );

const InquiryForm: React.FC<{ kind: Kind }> = ({ kind }) => {
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setState('sending'); setError('');
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        try {
            const res = await fetch('/api/send-inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, kind }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || 'Something went wrong. Please email studio@cratetv.net.');
            setState('sent');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
            setState('idle');
        }
    };

    if (state === 'sent') {
        return (
            <div className="text-center py-10 space-y-3">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Got it, thank you!</h3>
                <p className="text-gray-400 max-w-md mx-auto">We'll email you back with next steps and pricing. Keep an eye on your inbox (and spam folder) for studio@cratetv.net.</p>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            {/* Hidden from people; bots fill it in. */}
            <input type="text" name="company_site" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px opacity-0" />
            <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Your name" name="name" required maxLength={100} />
                <Field label="Your email" name="email" type="email" required maxLength={254} />
            </div>
            {kind === 'festival' ? (
                <>
                    <Field label="Festival name" name="festivalName" required />
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Field label="Festival dates" name="dates" placeholder="e.g. May 14–16, 2027" />
                        <Field label="About how many films?" name="filmCount" placeholder="e.g. 25 shorts" maxLength={40} />
                    </div>
                    <Field label="Where is your audience?" name="location" placeholder="e.g. Philadelphia, or worldwide" />
                    <Field label="Festival website or FilmFreeway page" name="link" placeholder="https://" maxLength={300} />
                </>
            ) : (
                <>
                    <Field label="Film title" name="filmTitle" required />
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Field label="Runtime" name="runtime" placeholder="e.g. 14 min" maxLength={40} />
                        <Field label="Preferred premiere date" name="preferredDate" placeholder="e.g. a Friday in March" maxLength={100} />
                    </div>
                    <div>
                        <label htmlFor="f-ticketing" className="form-label">Tickets</label>
                        <select id="f-ticketing" name="ticketing" defaultValue="unsure" className="form-input">
                            <option value="paid">Paid tickets</option>
                            <option value="pwyw">Pay what you want ($3 minimum)</option>
                            <option value="free">Free</option>
                            <option value="unsure">Not sure yet</option>
                        </select>
                    </div>
                    <Field label="Trailer or screener link" name="link" placeholder="https://" maxLength={300} />
                </>
            )}
            <div>
                <label htmlFor="f-message" className="form-label">Anything else?</label>
                <textarea id="f-message" name="message" rows={4} maxLength={3000} className="form-input"
                    placeholder={kind === 'festival' ? 'Ticket prices you had in mind, questions, anything.' : 'Tell us about your film and who your audience is.'} />
            </div>
            <button type="submit" disabled={state === 'sending'} className="submit-btn w-full">
                {state === 'sending' ? 'Sending…' : kind === 'festival' ? 'Ask about hosting' : 'Ask about a premiere'}
            </button>
            {error && <p className="text-center text-red-500 text-sm font-bold">{error}</p>}
            <p className="text-center text-xs text-gray-500">No commitment. We reply by email.</p>
        </form>
    );
};

const PitchLayout: React.FC<{
    kind: Kind;
    pageTitle: string;
    eyebrow: string;
    title: React.ReactNode;
    intro: string;
    cta: string;
    features: Feature[];
    trust?: { title: string; points: string[] };
    steps: string[];
    pricing: { title: string; body: string };
    faqs: [string, string][];
    crossLink: { text: string; path: string };
}> = (p) => {
    useEffect(() => {
        const prev = document.title;
        document.title = p.pageTitle;
        return () => { document.title = prev; };
    }, [p.pageTitle]);

    return (
        <div className="flex flex-col min-h-screen text-white bg-[#050505]">
            <Header searchQuery="" onSearch={() => {}} isScrolled={true} onMobileSearchClick={() => {}} showSearch={false} />
            <main className="flex-grow pt-24 pb-24 md:pb-0">
                {/* Hero */}
                <section className="relative overflow-hidden px-4 md:px-12">
                    <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.22),transparent_60%)]" />
                    <div className="relative max-w-5xl mx-auto text-center py-14 md:py-24">
                        <p className="text-red-500 font-black uppercase tracking-[0.35em] text-[10px] md:text-xs mb-5">{p.eyebrow}</p>
                        <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter leading-[0.95]">{p.title}</h1>
                        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed">{p.intro}</p>
                        <button onClick={scrollToForm} className="mt-9 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm px-9 py-4 rounded-xl shadow-[0_10px_40px_rgba(220,38,38,0.35)] transition-all">{p.cta}</button>
                        <p className="text-gray-500 text-xs uppercase tracking-[0.25em] mt-6">Home of the Playhouse West Film Festival online</p>
                    </div>
                </section>

                {/* What you get */}
                <section className="px-4 md:px-12 py-10">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-8 border-l-4 border-red-600 pl-4">What you get</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {p.features.map(f => (
                                <div key={f.title} className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                                    <div className="text-3xl mb-3" aria-hidden="true">{f.icon}</div>
                                    <h3 className="font-black text-lg mb-2">{f.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {p.trust && (
                    <section className="px-4 md:px-12 py-10">
                        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6 md:p-10">
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-6">{p.trust.title}</h2>
                            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                                {p.trust.points.map(t => (
                                    <li key={t} className="flex gap-3 text-gray-300"><span className="text-green-500 font-black">✓</span><span>{t}</span></li>
                                ))}
                            </ul>
                        </div>
                    </section>
                )}

                {/* How it works */}
                <section className="px-4 md:px-12 py-10">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-8 border-l-4 border-red-600 pl-4">How it works</h2>
                        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {p.steps.map((s, i) => (
                                <li key={s} className="rounded-2xl border border-white/10 p-6">
                                    <span className="block text-5xl font-black text-red-600/80 leading-none mb-3">{i + 1}</span>
                                    <span className="text-gray-200 font-semibold leading-snug">{s}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* Pricing */}
                <section className="px-4 md:px-12 py-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-4">{p.pricing.title}</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">{p.pricing.body}</p>
                    </div>
                </section>

                {/* Form */}
                <section id="ask" className="px-4 md:px-12 py-10 scroll-mt-24">
                    <div className="max-w-3xl mx-auto bg-white/5 border border-white/10 p-6 sm:p-10 rounded-[2rem] shadow-2xl">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-2 text-center">{p.cta}</h2>
                        <p className="text-gray-400 text-center mb-8">A few details and we'll take it from there.</p>
                        <InquiryForm kind={p.kind} />
                    </div>
                </section>

                {/* FAQ */}
                <section className="px-4 md:px-12 py-10">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-6">Questions</h2>
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {p.faqs.map(([q, a]) => (
                                <details key={q} className="group py-4">
                                    <summary className="cursor-pointer list-none flex justify-between gap-4 font-bold text-white">
                                        {q}<span className="text-red-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                                    </summary>
                                    <p className="text-gray-400 mt-3 leading-relaxed">{a}</p>
                                </details>
                            ))}
                        </div>
                        <p className="text-center text-gray-500 text-sm mt-10">
                            {p.crossLink.text}{' '}
                            <a href={p.crossLink.path} onClick={e => { e.preventDefault(); go(p.crossLink.path); }} className="text-red-500 font-bold hover:text-red-400">Find out more →</a>
                        </p>
                    </div>
                </section>
            </main>
            <CollapsibleFooter />
            <BackToTopButton />
            <BottomNavBar onSearchClick={() => {}} />
        </div>
    );
};

export const HostFestivalPage: React.FC = () => (
    <PitchLayout
        kind="festival"
        pageTitle="Host Your Film Festival Online | Crate TV"
        eyebrow="For film festivals"
        title={<>Take your festival <span className="text-red-600">online</span></>}
        intro="Hand us your lineup and schedule. We put it online with tickets, passes, live screenings and payouts. No setup fee: we share the ticket revenue."
        cta="Tell us about your festival"
        features={[
            { icon: '🎪', title: 'Your own festival page', body: 'Your lineup, schedule and blocks on a page of its own, ready to share with your audience.' },
            { icon: '🎟️', title: 'Tickets and passes', body: 'Tickets for each block, full-festival passes and promo codes. Payments are handled for you.' },
            { icon: '🔴', title: 'Live screenings', body: 'Every block plays as a live watch party: countdown, everyone watching together, live chat and reactions.' },
            { icon: '🎤', title: 'Filmmaker Q&As', body: 'Bring directors on live after their block so your audience can ask questions.' },
            { icon: '📊', title: 'Your own dashboard', body: 'See your ticket sales, and your payout after the festival.' },
            { icon: '✍️', title: 'Filmmaker agreements', body: 'We send each filmmaker a simple online agreement to sign, so screening rights are on record.' },
        ]}
        trust={{
            title: 'Your films are protected',
            points: [
                'Every viewer\'s ticket is checked by our server before a film plays',
                'Film links expire within hours, so a shared link goes dead',
                'No download button on the player',
                'One device per ticket at a time',
            ],
        }}
        steps={[
            'Send us your accepted films, posters and schedule.',
            'We set up your page, tickets and screenings.',
            'Your audience buys tickets and watches live.',
            'After the festival, you get your share of ticket sales.',
        ]}
        pricing={{
            title: 'No setup fee',
            body: 'You don\'t pay anything up front. CRATE keeps a share of ticket sales and you keep the rest. We\'ll send you the exact terms when you get in touch.',
        }}
        faqs={[
            ['Does our team need technical skills?', 'No. You send the films and the schedule; we do the setup and run the screenings.'],
            ['What do we need to send?', 'The film files, a poster and short description for each film, and your schedule (which films play in which block, and when).'],
            ['Can people watch from anywhere?', 'Yes, on a computer, phone or tablet. Ticket holders can watch from wherever they are.'],
            ['Can we still hold an in-person festival?', 'Yes. Lots of festivals do both: in-person screenings, plus an online version for people who can\'t make it.'],
        ]}
        crossLink={{ text: 'Are you a filmmaker with one film to show?', path: '/premiere' }}
    />
);

export const PremierePage: React.FC = () => (
    <PitchLayout
        kind="premiere"
        pageTitle="Premiere Your Film Online | Crate TV"
        eyebrow="For filmmakers"
        title={<>Premiere your film on <span className="text-red-600">CRATE</span></>}
        intro="A real premiere night, online. A countdown, tickets, your audience watching together with live chat, and a Q&A with you after. Your people can be anywhere."
        cta="Plan my premiere"
        features={[
            { icon: '⏳', title: 'Premiere page and countdown', body: 'Your film gets its own premiere page, and appears in "Upcoming watch parties" on CRATE\'s home page.' },
            { icon: '🎟️', title: 'Tickets your way', body: 'Paid tickets, pay what you want ($3 minimum), or free. People can buy days ahead.' },
            { icon: '🍿', title: 'Everyone watches together', body: 'At start time the film plays for everyone at once, with live chat and reactions.' },
            { icon: '🎤', title: 'Live Q&A after', body: 'Come on live after the film and answer your audience\'s questions.' },
            { icon: '📈', title: 'Know your numbers', body: 'How many tickets sold and how many people watched.' },
            { icon: '📺', title: 'Stays on CRATE after', body: 'After the premiere your film can stay in the CRATE catalog, earning from rentals.' },
        ]}
        steps={[
            'Tell us about your film.',
            'We reply with dates and pricing.',
            'You share your premiere link; we handle tickets and the screening.',
            'Premiere night: watch with your audience, then do your Q&A.',
        ]}
        pricing={{
            title: 'Simple pricing',
            body: 'Every premiere is a little different, so we\'ll send you a clear price after you tell us about your film. No commitment until you say yes.',
        }}
        faqs={[
            ['Does my film need to be on CRATE already?', 'No. Send us a link to the film or a trailer and we\'ll take it from there.'],
            ['Can people watch from anywhere?', 'Yes, on a computer, phone or tablet, wherever they are.'],
            ['Is my film safe?', 'Each viewer\'s ticket is checked before the film plays, film links expire within hours, and there\'s no download button.'],
            ['Can I make it free?', 'Yes. Free, paid, or pay what you want: you choose.'],
        ]}
        crossLink={{ text: 'Running a whole festival?', path: '/host' }}
    />
);
