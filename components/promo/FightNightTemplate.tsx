// The "Fight Night" promo template: giant title over a picture circle, the two
// sides face to face, countdown → reveal, pick-a-side vote, partners,
// Instagram posts and a footer. Everything it shows comes from the page data
// (api/_lib/promoRules.ts) — this file is the look, not the content.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PromoPage, PromoSideKey, PROMO_FONTS, promoFontsHref, isRevealed } from '../../api/_lib/promoRules';
import { FIGHT_NIGHT_CSS } from './promoStyles';

export interface PromoActions {
    /** Sign up (and vote if side given). Resolves to new vote totals, or throws with a message. */
    submit: (email: string, side: PromoSideKey | null) => Promise<{ votesA: number; votesB: number } | null>;
}

/** Puts the template's fonts and styles on the page once. */
export const usePromoAssets = (page: PromoPage | null) => {
    useEffect(() => {
        if (!page) return;
        const id = 'pp-fonts';
        let link = document.getElementById(id) as HTMLLinkElement | null;
        if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link); }
        link.href = promoFontsHref([page.look.font]);
        if (!document.getElementById('pp-css')) {
            const s = document.createElement('style'); s.id = 'pp-css'; s.textContent = FIGHT_NIGHT_CSS; document.head.appendChild(s);
        }
    }, [page?.look.font]);
};

export const promoVars = (page: PromoPage): React.CSSProperties => ({
    ['--bg' as any]: page.look.bg, ['--ink' as any]: page.look.ink, ['--accent' as any]: page.look.accent,
    ['--sideA' as any]: page.look.sideA, ['--sideB' as any]: page.look.sideB,
    ['--display' as any]: PROMO_FONTS[page.look.font]?.family || PROMO_FONTS.anton.family,
});

export const promoRootClass = (page: PromoPage, ready: boolean) =>
    ['pp', ready && 'ready', !page.look.grain && 'no-grain', !page.look.flare && 'no-flare', !page.look.letterbox && 'no-letterbox'].filter(Boolean).join(' ');

/** Fades sections in as they scroll into view. */
export const useReveal = (root: React.RefObject<HTMLElement>, deps: unknown[]) => {
    useEffect(() => {
        const el = root.current; if (!el) return;
        const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
        el.querySelectorAll('.rv, .pp-fight').forEach(n => io.observe(n));
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

const pad = (n: number) => String(n).padStart(2, '0');
export const PROMO_JUMPS = ['fight', 'countdown', 'vote', 'partners', 'back', 'instagram'];
const isVideoFile = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);

const Title: React.FC<{ text: string; o?: string }> = ({ text, o }) => (
    <h2>{text}{o ? <> <span className="o">{o}</span></> : null}</h2>
);

const FightNightTemplate: React.FC<{
    page: PromoPage;
    counts: { votesA: number; votesB: number };
    actions: PromoActions;
    /** The element that scrolls (the admin preview scrolls inside a box). Defaults to the window. */
    scroller?: HTMLElement | null;
    partnersHref?: string;
}> = ({ page, counts: initialCounts, actions, scroller }) => {
    usePromoAssets(page);
    const rootRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const bigRef = useRef<HTMLHeadingElement>(null);
    const [ready, setReady] = useState(false);
    const [slide, setSlide] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [hashReveal, setHashReveal] = useState(() => typeof window !== 'undefined' && window.location.hash === '#reveal');
    const [counts, setCounts] = useState(initialCounts);
    const [pick, setPick] = useState<PromoSideKey | null>(null);
    const [voteEmail, setVoteEmail] = useState('');
    const [voteMsg, setVoteMsg] = useState('');
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notifyMsg, setNotifyMsg] = useState('');
    const [busy, setBusy] = useState(false);
    const [trailerOpen, setTrailerOpen] = useState(false);

    const { hero, sideA, sideB, sections, countdown } = page;
    const media = hero.media.length ? hero.media : [{ type: 'image' as const, src: '', pos: '50% 50%' }];
    const revealed = hashReveal || isRevealed(page, now);
    const title = hero.title || page.title;

    useEffect(() => setCounts(initialCounts), [initialCounts.votesA, initialCounts.votesB]);
    useEffect(() => { const t = setTimeout(() => setReady(true), 150); return () => clearTimeout(t); }, []);
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    // Jump links for Instagram: …/#vote, #countdown, #fight, #partners, #back (after the reveal).
    useEffect(() => {
        const jump = () => {
            const id = window.location.hash.slice(1);
            if (!PROMO_JUMPS.includes(id)) return;
            // Wait for the intro and pictures to settle so we land in the right place.
            setTimeout(() => rootRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 700);
        };
        jump();
        window.addEventListener('hashchange', jump);
        return () => window.removeEventListener('hashchange', jump);
    }, []);
    useEffect(() => {
        const onHash = () => setHashReveal(window.location.hash === '#reveal');
        window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash);
    }, []);
    useEffect(() => {
        if (media.length < 2) return;
        const t = setInterval(() => setSlide(s => (s + 1) % media.length), 4500);
        return () => clearInterval(t);
    }, [media.length]);
    useReveal(rootRef, [page.slug, sections.fight, sections.vote, sections.partners, revealed]);

    // Giant title fills the screen edge to edge, whatever font loads.
    useEffect(() => {
        const fit = () => {
            const el = bigRef.current; if (!el) return;
            const vw = (scroller?.clientWidth || window.innerWidth);
            el.style.fontSize = '100px';
            const w = el.scrollWidth || 1;
            el.style.fontSize = `${(100 * vw * 0.94) / w}px`;
        };
        fit();
        (document as any).fonts?.ready?.then(fit);
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [title, page.look.font, scroller]);

    // Scrolling down: the circle grows to fill the screen and the title fades.
    useEffect(() => {
        const target: HTMLElement | Window = scroller || window;
        const onScroll = () => {
            const heroEl = heroRef.current, stage = stageRef.current, big = bigRef.current;
            if (!heroEl || !stage || !big) return;
            const vh = scroller?.clientHeight || window.innerHeight;
            const vw = scroller?.clientWidth || window.innerWidth;
            const top = heroEl.getBoundingClientRect().top - (scroller ? scroller.getBoundingClientRect().top : 0);
            const p = Math.min(1, Math.max(0, -top / Math.max(1, heroEl.offsetHeight - vh)));
            const grow = (Math.hypot(vw, vh) / Math.max(1, stage.offsetWidth)) * 1.05;
            stage.style.transform = `scale(${1 + (grow - 1) * p * p})`;
            big.style.opacity = String(Math.max(0, 1 - p * 1.6));
            big.style.transform = `translate(-50%,-50%) scale(${1 + p * 0.25})`;
        };
        target.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();
        return () => { target.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
    }, [scroller]);

    // Instagram embeds
    useEffect(() => {
        if (!sections.instagram || !page.instagram.posts.length) return;
        const w = window as any;
        if (w.instgrm) { w.instgrm.Embeds.process(); return; }
        if (!document.getElementById('ig-embed')) {
            const s = document.createElement('script'); s.id = 'ig-embed'; s.async = true; s.src = 'https://www.instagram.com/embed.js';
            document.body.appendChild(s);
        }
    }, [sections.instagram, page.instagram.posts.join('|')]);

    const left = Math.max(0, Date.parse(countdown.date) - now || 0);
    const clock = {
        d: Math.floor(left / 864e5), h: Math.floor((left % 864e5) / 36e5),
        m: Math.floor((left % 36e5) / 6e4), s: Math.floor((left % 6e4) / 1e3),
    };
    const hasDate = !Number.isNaN(Date.parse(countdown.date));
    const tot = counts.votesA + counts.votesB;
    const pctA = tot ? Math.round((counts.votesA / tot) * 100) : 50;
    const marquee = useMemo(() => page.marquee.split('·').map(s => s.trim()).filter(Boolean), [page.marquee]);

    const send = async (email: string, side: PromoSideKey | null, setMsg: (m: string) => void, okMsg: string, reset: () => void) => {
        setBusy(true); setMsg('');
        try {
            const c = await actions.submit(email, side);
            if (c) setCounts(c);
            setMsg(okMsg); reset();
        } catch (e: any) { setMsg(e?.message || 'Something went wrong. Try again.'); }
        finally { setBusy(false); }
    };

    const tape = (s: typeof sideA) => s.tape.filter(r => (r[0] || '').trim() && (r[1] || '').trim());
    // Close-ups from the circle make the best vote faces; fall back to the tall photo.
    const faceOf = (s: typeof sideA, idx: number) => (hero.media[idx]?.type === 'image' && hero.media[idx]?.src) || s.photo || '';

    return (
        <div ref={rootRef} className={promoRootClass(page, ready)} style={promoVars(page)}>
            <div className="pp-grid" />
            <div className="pp-grain" />
            <div className="pp-lbx t" /><div className="pp-lbx b" />

            <header className="pp-bar">
                <span className="mark">{title}</span>
                <span className="meta">{revealed ? 'A film' : hero.topMeta}</span>
                <span className="meta" />
            </header>

            <main className="pp-main">
                {/* ── Title + circle ── */}
                <section className="pp-hero" ref={heroRef}>
                    <div className="pp-sticky">
                        <div className="pp-words" aria-hidden="true">
                            <div className="pp-row">{Array(6).fill(`${title} ·`).join(' ')}</div>
                            <div className="pp-row r2">{Array(6).fill(`${title} ·`).join(' ')}</div>
                        </div>
                        <div className="pp-stage" ref={stageRef}>
                            {hero.ringText && (
                                <svg className="pp-ringtext" viewBox="0 0 100 100" aria-hidden="true">
                                    <defs><path id="pp-cp" d="M50,50 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" /></defs>
                                    <text><textPath href="#pp-cp">{hero.ringText}</textPath></text>
                                </svg>
                            )}
                            <div className="pp-circle">
                                {media.map((m, i) => (
                                    <div key={i} className={`pp-slide${i === slide % media.length ? ' on' : ''}`}>
                                        {!m.src ? <div className="ph" />
                                            : m.type === 'video'
                                                ? <video src={m.src} muted loop playsInline autoPlay style={{ objectPosition: m.pos }} />
                                                : <img src={m.src} alt="" style={{ objectPosition: m.pos }} />}
                                    </div>
                                ))}
                            </div>
                            <div className="pp-flare" />
                            {media.length > 1 && <div className="pp-dots">{media.map((_, i) => <b key={i} className={i === slide % media.length ? 'on' : ''} />)}</div>}
                        </div>
                        <h1 className="pp-big" ref={bigRef}>{title}</h1>
                        <div className="pp-herofoot">
                            <span>{revealed ? 'A CRATE TV promotion' : hero.footLeft}</span>
                            <span className="mid">Scroll ↓</span>
                            <span>{hero.footRight}</span>
                        </div>
                    </div>
                </section>

                {marquee.length > 0 && (
                    <div className="pp-marquee" aria-hidden="true">
                        <div>{Array(6).fill(0).flatMap((_, k) => marquee.map((w, i) => (
                            <span key={`${k}-${i}`} className={/^vs$/i.test(w) ? 'g' : ''}>{w}<span className="g"> ✦</span></span>
                        )))}</div>
                    </div>
                )}

                {/* ── The two sides ── */}
                {sections.fight && (
                    <section id="fight" className="pp-fight">
                        {[{ s: sideA, k: 'a' }, { s: sideB, k: 'b' }].map(({ s, k }) => (
                            <div key={k} className={`pp-fighter ${k}`}>
                                <div className={`pic${s.photo ? '' : ' empty'}`} style={s.photo ? { backgroundImage: `url("${s.photo}")` } : undefined}>
                                    {!s.photo && <span>Photo</span>}
                                </div>
                                <div className="rim" />
                                <div className="pp-info rv">
                                    <span className="pp-corner">{k === 'b' ? <>{s.corner}<i /></> : <><i />{s.corner}</>}</span>
                                    <div className="pp-fname">{s.first}{s.last && <em>{s.last}</em>}</div>
                                    {s.nickname && <div className="pp-nick">"{s.nickname}"</div>}
                                    {tape(s).length > 0 && (
                                        <dl className="pp-tape">{tape(s).map(([a, b], i) => <div key={i}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="pp-vsbadge">VS</div>
                    </section>
                )}

                {/* ── Countdown / reveal ── */}
                {sections.countdown && (
                    <section id="countdown" className="pp-sec pp-center">
                        <div className="rv">
                            <p className="pp-eyebrow">{revealed ? countdown.revealEyebrow : countdown.eyebrow}</p>
                            {revealed ? <Title text={countdown.revealHeadline} o={countdown.revealOutlined} /> : <Title text={countdown.headline} o={countdown.outlined} />}
                        </div>
                        {!revealed && hasDate && (
                            <div className="pp-clock rv">
                                <div><b>{pad(clock.d)}</b><span>Days</span></div><div className="sep">:</div>
                                <div><b>{pad(clock.h)}</b><span>Hours</span></div><div className="sep">:</div>
                                <div><b>{pad(clock.m)}</b><span>Min</span></div><div className="sep">:</div>
                                <div><b>{pad(clock.s)}</b><span>Sec</span></div>
                            </div>
                        )}
                        {revealed && countdown.trailerUrl && (
                            <div className="rv" style={{ marginTop: 50 }}>
                                {isVideoFile(countdown.trailerUrl)
                                    ? <button className="pp-btn" onClick={() => setTrailerOpen(true)}>▶ Watch the trailer</button>
                                    : <a className="pp-btn" href={countdown.trailerUrl} target="_blank" rel="noreferrer">▶ Watch the trailer</a>}
                            </div>
                        )}
                        {!revealed && (
                            <>
                                <form className="pp-notify rv" onSubmit={e => { e.preventDefault(); send(notifyEmail, null, setNotifyMsg, "You're in. Watch your inbox.", () => setNotifyEmail('')); }}>
                                    <input type="email" required value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="Your email — get every update first" />
                                    <button type="submit" disabled={busy}>{countdown.buttonText || "I'm in"}</button>
                                </form>
                                <p className="pp-ok">{notifyMsg}</p>
                            </>
                        )}
                    </section>
                )}

                {/* ── Crowdfund (after the reveal) ── */}
                {revealed && page.crowdfund.tiers.length > 0 && (
                    <section id="back" className="pp-sec">
                        <div className="rv">
                            <p className="pp-eyebrow">{page.crowdfund.eyebrow}</p>
                            <Title text={page.crowdfund.headline} o={page.crowdfund.outlined} />
                            {page.crowdfund.text && <p className="pp-lede">{page.crowdfund.text}</p>}
                        </div>
                        <div className="pp-tiers rv">
                            {page.crowdfund.tiers.map((t, i) => {
                                // Tapping a level goes to its own payment link, else the main one. CRATE never takes the money.
                                const href = t.link || page.crowdfund.link;
                                const inner = <><b>{t.amount}</b><h4>{t.name}</h4><p>{t.text}</p>{href && <span className="pp-tiergo">Join this corner →</span>}</>;
                                return href
                                    ? <a key={i} className="pp-tier go" href={href} target="_blank" rel="noreferrer">{inner}</a>
                                    : <div key={i} className="pp-tier">{inner}</div>;
                            })}
                        </div>
                        {page.crowdfund.link && <p style={{ marginTop: 40 }}><a className="pp-btn" href={page.crowdfund.link} target="_blank" rel="noreferrer">Join the corner →</a></p>}
                    </section>
                )}

                {/* ── Pick a side ── */}
                {sections.vote && (
                    <section id="vote" className="pp-sec pp-center">
                        <div className="rv">
                            <p className="pp-eyebrow">{page.vote.eyebrow}</p>
                            <Title text={page.vote.headline} o={page.vote.outlined} />
                        </div>
                        <div className="pp-vs rv">
                            {([['a', sideA, 0], ['b', sideB, 1]] as const).map(([k, s, idx], i) => (
                                <React.Fragment key={k}>
                                    {i === 1 && <div className="pp-vsmid">VS</div>}
                                    <div className={`pp-side ${k}${pick === k ? ' chosen' : ''}`} role="button" tabIndex={0}
                                        style={{ ['--img' as any]: faceOf(s, idx) ? `url("${faceOf(s, idx)}")` : 'none' }}
                                        onClick={() => { setPick(k); setVoteMsg(`You picked ${s.first.toUpperCase()}. Add your email to lock it in.`); }}
                                        onKeyDown={e => { if (e.key === 'Enter') setPick(k); }}>
                                        <div><h3>{s.first}</h3><span>{s.corner}</span></div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="pp-meter"><i style={{ width: `${pctA}%`, background: 'var(--sideA)' }} /><i style={{ width: `${100 - pctA}%`, background: 'var(--sideB)' }} /></div>
                        <div className="pp-meterl"><span>{sideA.first} {pctA}%</span><span>{100 - pctA}% {sideB.first}</span></div>
                        <form className="pp-notify" style={{ marginTop: 40 }} onSubmit={e => {
                            e.preventDefault();
                            if (!pick) { setVoteMsg('Pick a side first.'); return; }
                            const name = (pick === 'a' ? sideA : sideB).first.toUpperCase();
                            send(voteEmail, pick, setVoteMsg, `Locked in for ${name}.`, () => setVoteEmail(''));
                        }}>
                            <input type="email" required value={voteEmail} onChange={e => setVoteEmail(e.target.value)} placeholder="Your email to lock in your pick" />
                            <button type="submit" disabled={busy}>Lock in</button>
                        </form>
                        <p className="pp-ok">{voteMsg}</p>
                    </section>
                )}

                {/* ── Instagram ── */}
                {sections.instagram && page.instagram.posts.length > 0 && (
                    <section id="instagram" className="pp-sec">
                        <div className="rv">
                            <p className="pp-eyebrow">On Instagram</p>
                            <Title text="Follow" o={page.instagram.handle ? `@${page.instagram.handle.replace(/^@/, '')}` : 'along'} />
                        </div>
                        <div className="pp-ig">
                            {page.instagram.posts.map(u => (
                                <blockquote key={u} className="instagram-media" data-instgrm-permalink={u} data-instgrm-version="14">
                                    <a href={u} target="_blank" rel="noreferrer">View this post on Instagram</a>
                                </blockquote>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Partners ── */}
                {sections.partners && (
                    <section id="partners" className="pp-sec">
                        <div className="rv">
                            <p className="pp-eyebrow">{page.partnersBlock.eyebrow}</p>
                            <Title text={page.partnersBlock.headline} o={page.partnersBlock.outlined} />
                        </div>
                        <div className="pp-slots rv">
                            {(page.partnersBlock.slots.length ? page.partnersBlock.slots : Array(5).fill(null)).map((s, i) => s && s.logo
                                ? <a key={i} className="pp-slot" href={s.link || undefined} target="_blank" rel="noreferrer" title={s.name}><img src={s.logo} alt={s.name} /></a>
                                : <div key={i} className="pp-slot">{s?.name || (i === 0 ? 'Presenting partner' : 'Your logo here')}</div>)}
                        </div>
                        <div className="pp-pcta rv">
                            {page.partnersBlock.text && <p className="pp-lede" style={{ margin: 0 }}>{page.partnersBlock.text}</p>}
                            {page.partnersBlock.email && <a className="pp-btn" href={`mailto:${page.partnersBlock.email}`}>Become a partner →</a>}
                        </div>
                    </section>
                )}
            </main>

            <footer className="pp-foot">
                <div className="pp-footmark">{title}</div>
                <div className="pp-footrow">
                    <p>{page.footer.line1}{page.footer.line2 && <><br />{page.footer.line2}</>}</p>
                    <div className="pp-footcol">
                        <h5>Follow</h5>
                        {page.instagram.url && <a href={page.instagram.url} target="_blank" rel="noreferrer">Instagram</a>}
                        <a href="https://cratetv.net">CRATE TV</a>
                    </div>
                    <div className="pp-footcol">
                        <h5>Contact</h5>
                        {page.footer.pressEmail && <a href={`mailto:${page.footer.pressEmail}`}>Press</a>}
                        {page.partnersBlock.email && <a href={`mailto:${page.partnersBlock.email}`}>Partners</a>}
                    </div>
                </div>
                <div className="pp-fine">
                    <span><a href="https://cratetv.net">{page.footer.credit || `A CRATE TV promotion for ${title}`}</a></span>
                    <span>© {new Date().getFullYear()} {title}</span>
                </div>
            </footer>

            {trailerOpen && (
                <div className="pp-lb" onClick={() => setTrailerOpen(false)}>
                    <button className="close">CLOSE ✕</button>
                    <div className="box" onClick={e => e.stopPropagation()}><video src={countdown.trailerUrl} controls autoPlay playsInline /></div>
                </div>
            )}
        </div>
    );
};

export default FightNightTemplate;
