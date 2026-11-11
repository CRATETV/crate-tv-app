// The private partners page for a promo (cratetv.net/p/<slug>/partners).
// Not linked from the public page; you send the link to companies.

import React, { useEffect, useRef, useState } from 'react';
import { PromoPage, PromoInterest, DEFAULT_INTEREST_FORM, NOT_SURE } from '../../api/_lib/promoRules';
import { usePromoAssets, promoVars, promoRootClass, useReveal } from './FightNightTemplate';

const Title: React.FC<{ text: string; o?: string }> = ({ text, o }) => (
    <h2>{text}{o ? <> <span className="o">{o}</span></> : null}</h2>
);

/** Sends the "I'm interested" form. The default emails it to the film's contact email (nothing saved). */
const sendInterest = async (slug: string, answer: PromoInterest & { website: string }) => {
    const r = await fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'interest', slug, ...answer }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.');
};

const InterestForm: React.FC<{ page: PromoPage; pick: string; setPick: (p: string) => void; onSend: (a: PromoInterest & { website: string }) => Promise<void> }> = ({ page, pick, setPick, onSend }) => {
    const pp = page.partnerPage;
    const form = pp.form || DEFAULT_INTEREST_FORM;
    const [f, setF] = useState({ name: '', business: '', phone: '', email: '', message: '', website: '' });
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [err, setErr] = useState('');
    const packs = [...pp.packs.map(p => p.name).filter(Boolean), NOT_SURE];
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }));

    if (state === 'sent') {
        return (
            <div className="pp-ifdone rv in">
                <h3>Got it, {f.name.split(' ')[0] || 'thank you'}.</h3>
                <p>We'll reach out within two days{f.phone ? ` at ${f.phone}` : ''}. Talk soon.</p>
            </div>
        );
    }
    return (
        <form className="pp-if rv" onSubmit={async e => {
            e.preventDefault(); setErr(''); setState('sending');
            try { await onSend({ ...f, pack: pick || NOT_SURE }); setState('sent'); }
            catch (x: any) { setErr(x?.message || 'Something went wrong. Try again.'); setState('idle'); }
        }}>
            <p className="pp-iflabel">Which package?</p>
            <div className="pp-ifpacks">
                {packs.map(n => <button type="button" key={n} className={pick === n ? 'on' : ''} onClick={() => setPick(n)}>{n}</button>)}
            </div>
            <div className="pp-ifgrid">
                <label><span>Your name</span><input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
                <label><span>Business</span><input required value={f.business} onChange={set('business')} autoComplete="organization" /></label>
                <label><span>Phone</span><input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
                <label><span>Email</span><input type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
            </div>
            <label className="pp-ifmsg"><span>Anything we should know? (optional)</span><textarea value={f.message} onChange={set('message')} rows={3} /></label>
            <input className="pp-ifhp" tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} aria-hidden="true" />
            <div className="pp-ifsend">
                <button className="pp-btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : (form.button || 'Send')} →</button>
                <span>Phone or email, whichever you'd rather we use.</span>
            </div>
            {err && <p className="pp-iferr">{err}</p>}
        </form>
    );
};

const PromoPartnersView: React.FC<{ page: PromoPage; onInterest?: (a: PromoInterest & { website: string }) => Promise<void> }> = ({ page, onInterest }) => {
    const [pick, setPick] = useState('');
    const formRef = useRef<HTMLElement>(null);
    usePromoAssets(page);
    const rootRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => { const t = setTimeout(() => setReady(true), 100); return () => clearTimeout(t); }, []);
    useReveal(rootRef, [page.slug]);

    const pp = page.partnerPage;
    const title = page.hero.title || page.title;
    const form = pp.form || DEFAULT_INTEREST_FORM;
    const showForm = !!form.enabled && !!pp.contactEmail;
    const faceA = page.hero.media[0]?.src || page.sideA.photo || '';
    const faceB = page.hero.media[1]?.src || page.sideB.photo || '';
    let n = 0;
    const num = () => String(++n).padStart(2, '0');

    return (
        <div ref={rootRef} className={promoRootClass({ ...page, look: { ...page.look, letterbox: false } }, ready)} style={promoVars(page)}>
            <div className="pp-grid" />
            <div className="pp-grain" />
            <header className="pp-bar">
                <span className="mark">{title}</span>
                <span className="meta">Partner information · Private</span>
            </header>

            <main className="pp-main">
                <section className="pp-phero">
                    <div className="rv">
                        <p className="pp-eyebrow">For partners</p>
                        <h1>{pp.headline}<br /><span className="o">{pp.outlined}</span></h1>
                        {pp.intro && <p className="pp-lede" style={{ fontSize: 18 }}>{pp.intro}</p>}
                    </div>
                    <div className="pp-duo rv">
                        <div className="c a" style={faceA ? { backgroundImage: `url("${faceA}")` } : undefined} />
                        <div className="c b" style={faceB ? { backgroundImage: `url("${faceB}")` } : undefined} />
                        <div className="vs">VS</div>
                    </div>
                </section>

                {pp.steps.length > 0 && (
                    <section className="pp-psec">
                        <div className="rv"><p className="pp-num">{num()}</p><Title text="How it" o="works" /></div>
                        <div className="pp-steps rv">
                            {pp.steps.map((s, i) => <div key={i} className={`pp-step${s.key ? ' key' : ''}`}><span className="when">{s.when}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}
                        </div>
                    </section>
                )}

                {pp.places.length > 0 && (
                    <section className="pp-psec">
                        <div className="rv"><p className="pp-num">{num()}</p><Title text="Where your" o="brand shows up" /></div>
                        <div className="pp-places rv">
                            {pp.places.map((p, i) => <div key={i} className="pp-place"><div className="ico">{String(i + 1).padStart(2, '0')}</div><h3>{p.title}</h3><p>{p.text}</p></div>)}
                        </div>
                    </section>
                )}

                {pp.packs.length > 0 && (
                    <section className="pp-psec">
                        <div className="rv"><p className="pp-num">{num()}</p><Title text="Partner" o="packages" /></div>
                        <div className="pp-packs rv">
                            {pp.packs.map((p, i) => (
                                <div key={i} className={`pp-pack${p.top ? ' top' : ''}`}>
                                    <span className="tag">{p.tag}</span><h3>{p.name}</h3><div className="price">{p.price}</div><div className="spots">{p.spots}</div>
                                    <ul>{p.perks.filter(Boolean).map((x, j) => <li key={j}>{x}</li>)}</ul>
                                    {showForm && <button type="button" className="pp-choose" onClick={() => { setPick(p.name); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>I want this →</button>}
                                </div>
                            ))}
                        </div>
                        {pp.packsNote && <p className="pp-lede rv" style={{ maxWidth: 760 }}>{pp.packsNote}</p>}
                    </section>
                )}

                {showForm && (
                    <section className="pp-psec" ref={formRef}>
                        <div className="rv">
                            <p className="pp-num">{num()}</p><Title text={form.headline} o={form.outlined} />
                            {form.text && <p className="pp-lede">{form.text}</p>}
                        </div>
                        <InterestForm page={page} pick={pick} setPick={setPick} onSend={onInterest || (a => sendInterest(page.slug, a))} />
                    </section>
                )}

                {pp.team.length > 0 && (
                    <section className="pp-psec">
                        <div className="rv"><p className="pp-num">{num()}</p><Title text="The" o="team" /></div>
                        <div className="pp-team rv">
                            {pp.team.map((t, i) => (
                                <div key={i} className="pp-person">
                                    <div className="ph" style={t.photo ? { backgroundImage: `url("${t.photo}")` } : undefined}>{t.photo ? '' : 'PHOTO'}</div>
                                    <div><span className="role">{t.role}</span><h3>{t.name}</h3><p>{t.text}</p></div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {pp.stats.length > 0 && (
                    <section className="pp-psec">
                        <div className="rv"><p className="pp-num">{num()}</p><Title text="Who will" o="see it" /></div>
                        <div className="pp-stats rv">
                            {pp.stats.map((s, i) => <div key={i} className="pp-stat"><b>{s.n || '—'}</b><span>{s.label}</span><small>{s.note}</small></div>)}
                        </div>
                    </section>
                )}

                <section className="pp-psec pp-center" style={{ padding: '160px 6vw' }}>
                    <div className="rv">
                        <p className="pp-eyebrow">Let's talk</p>
                        <Title text="Get in" o="touch" />
                        {pp.contactEmail && <a className="pp-btn" style={{ marginTop: 44 }} href={`mailto:${pp.contactEmail}?subject=${encodeURIComponent(`${title} — Partnership`)}`}>Become a partner →</a>}
                        <p className="pp-lede" style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{[pp.contactEmail, pp.contactPhone].filter(Boolean).join('  ·  ')}</p>
                    </div>
                </section>
            </main>

            <footer className="pp-foot" style={{ paddingTop: 30 }}>
                <div className="pp-fine" style={{ border: 0, paddingTop: 0 }}>
                    <span>{title}</span>
                    <span>Campaign by <a href="https://cratetv.net">CRATE TV</a></span>
                </div>
            </footer>
        </div>
    );
};

export default PromoPartnersView;
