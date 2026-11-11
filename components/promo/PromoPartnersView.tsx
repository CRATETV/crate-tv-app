// The private partners page for a promo (cratetv.net/p/<slug>/partners).
// Not linked from the public page; you send the link to companies.

import React, { useEffect, useRef, useState } from 'react';
import { PromoPage } from '../../api/_lib/promoRules';
import { usePromoAssets, promoVars, promoRootClass, useReveal } from './FightNightTemplate';

const Title: React.FC<{ text: string; o?: string }> = ({ text, o }) => (
    <h2>{text}{o ? <> <span className="o">{o}</span></> : null}</h2>
);

const PromoPartnersView: React.FC<{ page: PromoPage }> = ({ page }) => {
    usePromoAssets(page);
    const rootRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    useEffect(() => { const t = setTimeout(() => setReady(true), 100); return () => clearTimeout(t); }, []);
    useReveal(rootRef, [page.slug]);

    const pp = page.partnerPage;
    const title = page.hero.title || page.title;
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
                                </div>
                            ))}
                        </div>
                        {pp.packsNote && <p className="pp-lede rv" style={{ maxWidth: 760 }}>{pp.packsNote}</p>}
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
