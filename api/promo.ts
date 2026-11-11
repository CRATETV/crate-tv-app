// api/promo.ts — the public side of a Promo Page. No sign-in needed.
//
//   GET  /api/promo?slug=the-champ            → the published page + vote totals
//        &view=partners                       → also includes the partners page
//   POST /api/promo { slug, email, side? }    → sign up for updates, and vote if side is 'a' or 'b'.
//        One entry per email: voting again moves the vote, it doesn't add one.
//
// Unpublished pages answer 404 here; the admin panel previews them itself.

import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { logServerError } from './_lib/logError.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { PROMO_PAGES, PROMO_ENTRIES, PromoPage, PromoSideKey, SLUG_RE, EMAIL_RE, countChange } from './_lib/promoRules.js';

const json = (body: unknown, status = 200, cache = 'no-store') =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

const entryId = (email: string) => createHash('sha256').update(email).digest('hex').slice(0, 40);

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const slug = String(url.searchParams.get('slug') || '');
        if (!SLUG_RE.test(slug)) return json({ error: 'Not found' }, 404);
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const snap = await db.collection(PROMO_PAGES).doc(slug).get();
        const data = snap.data() as (PromoPage & { votesA?: number; votesB?: number; signups?: number }) | undefined;
        if (!snap.exists || !data?.published) return json({ error: 'Not found' }, 404);

        const wantPartners = url.searchParams.get('view') === 'partners';
        const { votesA = 0, votesB = 0, signups = 0, createdAt, ...page } = data;
        void createdAt; void signups;
        if (!wantPartners || !page.partnerPage?.enabled) {
            // The partners page is unlisted: only sent when it's the page being opened.
            (page as Partial<PromoPage>).partnerPage = undefined;
        }
        return json({ page, counts: { votesA, votesB } }, 200, 'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
    } catch (e) {
        await logServerError('promo:get', e).catch(() => {});
        return json({ error: 'Something went wrong.' }, 500);
    }
}

export async function POST(request: Request) {
    try {
        if (!rateLimit(`promo:${getIP(request)}`, 10, 10 * 60_000)) {
            return json({ error: 'Too many tries. Please wait a few minutes.' }, 429);
        }
        const body = await request.json().catch(() => ({}));
        const slug = String(body?.slug || '');
        const email = String(body?.email || '').trim().toLowerCase().slice(0, 200);
        const side: PromoSideKey | null = body?.side === 'a' || body?.side === 'b' ? body.side : null;
        if (!SLUG_RE.test(slug)) return json({ error: 'Not found' }, 404);
        if (!EMAIL_RE.test(email)) return json({ error: 'Please enter a real email address.' }, 400);

        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const pageRef = db.collection(PROMO_PAGES).doc(slug);
        const entryRef = pageRef.collection(PROMO_ENTRIES).doc(entryId(email));

        const counts = await db.runTransaction(async tx => {
            const [pageSnap, entrySnap] = await Promise.all([tx.get(pageRef), tx.get(entryRef)]);
            const page = pageSnap.data();
            if (!pageSnap.exists || !page?.published) throw Object.assign(new Error('nf'), { status: 404 });
            const prev = entrySnap.exists ? (entrySnap.data() as { side?: PromoSideKey | null }) : null;
            const d = countChange(prev, side);
            const now = new Date().toISOString();
            tx.set(entryRef, {
                email,
                side: side ?? prev?.side ?? null,
                createdAt: entrySnap.exists ? entrySnap.data()?.createdAt || now : now,
                updatedAt: now,
            });
            if (d.votesA || d.votesB || d.signups) {
                tx.update(pageRef, {
                    votesA: FieldValue.increment(d.votesA),
                    votesB: FieldValue.increment(d.votesB),
                    signups: FieldValue.increment(d.signups),
                });
            }
            return { votesA: (page.votesA || 0) + d.votesA, votesB: (page.votesB || 0) + d.votesB };
        });
        return json({ ok: true, counts });
    } catch (e: any) {
        if (e?.status === 404) return json({ error: 'Not found' }, 404);
        await logServerError('promo:post', e).catch(() => {});
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
