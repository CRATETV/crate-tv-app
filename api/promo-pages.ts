// api/promo-pages.ts — Admin → Promo pages.
//
// Needs an admin key that opens the "promo" tab (owner keys always do; staff
// only if the owner switched "Promo pages" on for them in Team & permissions).
//
// Actions (POST { action, password, ... }):
//   list                              → every page (title, slug, published, counts, updatedAt)
//   get      { slug }                 → the full page
//   create   { title, slug, example? }→ new page ('champ' example fills The Champ's words)
//   duplicate{ from, title, slug }    → copy an existing page under a new address
//   save     { slug, page }           → saves the content and look (not the address or published)
//   publish  { slug, published }      → go live / take down
//   delete   { slug, confirm }        → removes the page, its votes and sign-ups. The template stays.
//   entries  { slug }                 → votes and email sign-ups
//   upload   { slug, fileName, fileType, fileSize } → a 5-minute link to upload one picture
//            or video into S3 under promo/<slug>/ (so staff with only this tab can upload)

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { canUseTab } from './_lib/adminAuth.js';
import { logServerError } from './_lib/logError.js';
import {
    PROMO_PAGES, PROMO_ENTRIES, PromoPage, blankPromo, theChampExample, cleanPromo, promoSlugify, slugProblem,
} from './_lib/promoRules.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const UPLOAD_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

class Oops extends Error { constructor(public status: number, message: string) { super(message); } }

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await canUseTab(body?.password, ['promo']))) return json({ error: 'Unauthorized' }, 401);
        const db = getAdminDb();
        if (!db) return json({ error: 'Service unavailable.' }, 503);
        const pages = db.collection(PROMO_PAGES);
        const now = () => new Date().toISOString();

        const load = async (slug: unknown) => {
            const s = String(slug || '');
            const snap = await pages.doc(s).get();
            if (!s || !snap.exists) throw new Oops(404, 'That promo page does not exist.');
            return { ref: snap.ref, page: snap.data() as PromoPage & { votesA?: number; votesB?: number; signups?: number } };
        };
        const newAddress = async (title: string, rawSlug: unknown) => {
            const slug = promoSlugify(String(rawSlug || title));
            const problem = slugProblem(slug);
            if (problem) throw new Oops(400, problem);
            if ((await pages.doc(slug).get()).exists) throw new Oops(409, `cratetv.net/p/${slug} is already taken.`);
            return slug;
        };

        switch (body.action) {
            case 'list': {
                const snap = await pages.orderBy('updatedAt', 'desc').get();
                return json({
                    pages: snap.docs.map(d => {
                        const p = d.data();
                        return { slug: d.id, title: p.title, published: !!p.published, updatedAt: p.updatedAt, votesA: p.votesA || 0, votesB: p.votesB || 0, signups: p.signups || 0 };
                    }),
                });
            }

            case 'get': {
                const { page } = await load(body.slug);
                // Fill in anything an older page is missing (new settings get their defaults).
                return json({ page: { ...cleanPromo(page, page.slug, !!page.published), updatedAt: page.updatedAt } });
            }

            case 'create': {
                const title = String(body.title || '').trim().slice(0, 120);
                if (!title) throw new Oops(400, "Give the page a title (the film's name).");
                const slug = await newAddress(title, body.slug);
                const page = body.example === 'champ' ? theChampExample(slug) : blankPromo(slug, title);
                page.title = title;
                await pages.doc(slug).set({ ...page, createdAt: now(), updatedAt: now(), votesA: 0, votesB: 0, signups: 0 });
                return json({ page });
            }

            case 'duplicate': {
                const { page: from } = await load(body.from);
                const title = String(body.title || `${from.title} copy`).trim().slice(0, 120);
                const slug = await newAddress(title, body.slug);
                const page = cleanPromo(from, slug, false);
                page.title = title;
                await pages.doc(slug).set({ ...page, createdAt: now(), updatedAt: now(), votesA: 0, votesB: 0, signups: 0 });
                return json({ page });
            }

            case 'save': {
                const { ref, page: current } = await load(body.slug);
                const page = cleanPromo(body.page, current.slug, !!current.published);
                await ref.update({ ...page, updatedAt: now() });
                return json({ page: { ...page, updatedAt: now() } });
            }

            case 'publish': {
                const { ref } = await load(body.slug);
                await ref.update({ published: !!body.published, updatedAt: now() });
                return json({ ok: true, published: !!body.published });
            }

            case 'delete': {
                const { ref, page } = await load(body.slug);
                if (String(body.confirm || '') !== page.slug) throw new Oops(400, 'Type the page address to confirm.');
                // Votes and sign-ups first, in batches, then the page.
                for (;;) {
                    const batch = await ref.collection(PROMO_ENTRIES).limit(400).get();
                    if (batch.empty) break;
                    const w = db.batch();
                    batch.docs.forEach(d => w.delete(d.ref));
                    await w.commit();
                }
                await ref.delete();
                return json({ ok: true });
            }

            case 'entries': {
                const { ref, page } = await load(body.slug);
                const snap = await ref.collection(PROMO_ENTRIES).orderBy('createdAt', 'desc').limit(5000).get();
                return json({
                    counts: { votesA: page.votesA || 0, votesB: page.votesB || 0, signups: page.signups || 0 },
                    entries: snap.docs.map(d => {
                        const e = d.data();
                        return { email: e.email, side: e.side || null, createdAt: e.createdAt };
                    }),
                });
            }

            case 'upload': {
                const { page } = await load(body.slug);
                const type = String(body.fileType || '');
                const size = Number(body.fileSize);
                const isImage = UPLOAD_IMAGE_TYPES.includes(type);
                const isVideo = UPLOAD_VIDEO_TYPES.includes(type);
                if (!isImage && !isVideo) throw new Oops(400, 'Upload a JPG, PNG or WebP picture, or an MP4/MOV/WebM video.');
                const max = isImage ? 20 * 1024 * 1024 : 500 * 1024 * 1024;
                if (!Number.isFinite(size) || size <= 0 || size > max) throw new Oops(400, isImage ? 'Pictures must be under 20 MB.' : 'Videos must be under 500 MB.');
                const bucket = process.env.AWS_S3_BUCKET_NAME;
                const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
                const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
                let region = process.env.AWS_S3_REGION;
                if (!bucket || !region || !accessKeyId || !secretAccessKey) throw new Oops(503, 'Uploads are not set up on the server.');
                if (region === 'global') region = 'us-east-1';
                const clean = String(body.fileName || 'file').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+/, '').slice(-80) || 'file';
                const key = `promo/${page.slug}/${Date.now()}-${clean}`;
                const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
                const signedUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: type }), { expiresIn: 300 });
                return json({ signedUrl, publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}` });
            }

            default:
                return json({ error: 'Unknown action.' }, 400);
        }
    } catch (e: any) {
        if (e instanceof Oops) return json({ error: e.message }, e.status);
        await logServerError('promo-pages', e).catch(() => {});
        return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
}
