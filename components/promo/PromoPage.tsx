// Route component for a published Promo Page:
//   cratetv.net/p/<slug>            and  <slug>.cratetv.net
//   cratetv.net/p/<slug>/partners   and  <slug>.cratetv.net/partners

import React, { useEffect, useState } from 'react';
import type { PromoPage as PromoData, PromoSideKey } from '../../api/_lib/promoRules';
import FightNightTemplate from './FightNightTemplate';
import PromoPartnersView from './PromoPartnersView';

const PromoPage: React.FC<{ slug: string; view: 'site' | 'partners' }> = ({ slug, view }) => {
    const [page, setPage] = useState<PromoData | null>(null);
    const [counts, setCounts] = useState({ votesA: 0, votesB: 0 });
    const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');

    useEffect(() => {
        let alive = true;
        fetch(`/api/promo?slug=${encodeURIComponent(slug)}${view === 'partners' ? '&view=partners' : ''}`)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(d => {
                if (!alive) return;
                if (view === 'partners' && !d.page?.partnerPage) { setState('missing'); return; }
                setPage(d.page); setCounts(d.counts || { votesA: 0, votesB: 0 }); setState('ok');
            })
            .catch(() => alive && setState('missing'));
        return () => { alive = false; };
    }, [slug, view]);

    useEffect(() => {
        if (!page) return;
        const t = page.hero.title || page.title;
        document.title = view === 'partners' ? `${t} — Partner with us` : t;
        let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
        if (view === 'partners') {
            if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
            robots.content = 'noindex, nofollow';
        }
    }, [page, view]);

    const submit = async (email: string, side: PromoSideKey | null) => {
        const r = await fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, email, side }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.');
        return d.counts || null;
    };

    if (state === 'loading') return <div style={{ minHeight: '100vh', background: '#050505' }} />;
    if (state === 'missing' || !page) {
        return (
            <div style={{ minHeight: '100vh', background: '#050505', color: '#f2efe8', display: 'grid', placeItems: 'center', fontFamily: 'system-ui', textAlign: 'center', padding: 24 }}>
                <div>
                    <p style={{ fontSize: 13, letterSpacing: '.3em', textTransform: 'uppercase', color: '#8a867d' }}>Not here yet</p>
                    <p style={{ marginTop: 16 }}>This page isn't live. <a href="https://cratetv.net" style={{ color: '#d4a845' }}>Go to CRATE TV →</a></p>
                </div>
            </div>
        );
    }
    return view === 'partners'
        ? <PromoPartnersView page={page} />
        : <FightNightTemplate page={page} counts={counts} actions={{ submit }} />;
};

export default PromoPage;
