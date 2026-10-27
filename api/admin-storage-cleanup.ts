// Admin → Storage clean-up (top admin password only).
//
//   POST { password, action:'scan' }
//        → the video files in the S3 bucket that CRATE doesn't use, one row
//          per film file (an HLS folder is one row), biggest first.
//   POST { password, action:'delete', ids:[...] }
//        → deletes those rows. The server works the list out AGAIN first and
//          only deletes files that are still unused right now: it never
//          trusts the browser's list. Permanent.
//        + removeFilms:true → also removes those rows' hidden films from the
//          catalog, but only films that never earned money and aren't in a
//          festival schedule (catalogRemoval in api/_lib/storageCleanup.ts).
//
// What counts as unused, and what is always kept: api/_lib/storageCleanup.ts.
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import type { Firestore } from 'firebase-admin/firestore';
import { fetchAllRelevantPayments, getSquareCredentials, computeRevenueByFilm } from './_lib/filmmakerBalance.js';
import { assembleAndSyncMasterData } from './publish-data.js';
import { FieldValue } from 'firebase-admin/firestore';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { getApiData } from './_lib/data.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { buildPlan, groupPlan, looksLikeRealCatalog, catalogRemoval, type BucketObject } from './_lib/storageCleanup.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function s3(): { client: S3Client; bucket: string } | null {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    if (!bucket || !accessKeyId || !secretAccessKey) return null;
    return { client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } }), bucket };
}

async function listAll(client: S3Client, bucket: string): Promise<BucketObject[]> {
    const out: BucketObject[] = [];
    let token: string | undefined;
    do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
        for (const o of page.Contents || []) if (o.Key) out.push({ Key: o.Key, Size: Number(o.Size) || 0, LastModified: o.LastModified?.toISOString() });
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return out;
}

/** Money each film has earned (cents), by lower-case title. Null if Square can't be checked. */
async function earnedByTitle(db: Firestore | null, data: any): Promise<Record<string, number> | null> {
    try {
        const { accessToken, locationId } = getSquareCredentials();
        if (!db || !accessToken) return null;
        const payments = await fetchAllRelevantPayments(accessToken, locationId);
        const movies = Object.entries(data?.movies || {}).map(([key, m]) => ({ key, ...(m as any) }));
        const rev = await computeRevenueByFilm(db, payments, movies as any);
        const out: Record<string, number> = {};
        for (const [title, r] of Object.entries(rev)) {
            const k = title.trim().toLowerCase();
            out[k] = (out[k] || 0) + r.donations + r.tickets + r.vodRentals;
        }
        return out;
    } catch (e) {
        console.error('[admin-storage-cleanup] earnings check failed', e);
        return null;
    }
}

async function currentPlan() {
    const store = s3();
    if (!store) throw new Error('Storage is not set up on the server.');
    const data = await getApiData({ noCache: true });
    // Never plan deletions from sample data or a half-loaded catalog.
    if (!looksLikeRealCatalog(data)) throw new Error('Could not load the real CRATE catalog right now. Nothing was planned. Try again in a few minutes.');
    const objects = await listAll(store.client, store.bucket);
    const result = buildPlan(objects, data, Date.now());
    return { ...result, groups: groupPlan(result.plan), store, totalObjects: objects.length, data };
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the main admin can use storage clean-up.' }, 401);
        const action = String(body.action || 'scan');

        if (action === 'scan') {
            const { groups, keptVideos, filmsInUse, filmsNotInUse, totalObjects, data } = await currentPlan();
            const now = Date.now();
            const earned = groups.some(g => g.filmKey) ? await earnedByTitle(getAdminDb(), data) : {};
            return json({
                groups: groups.map(g => {
                    const film = g.filmKey ? catalogRemoval(g.filmKey, data, earned, now) : null;
                    return {
                        id: g.id, label: g.label, detail: g.detail, reason: g.reason, size: g.size, files: g.keys.length, isFolder: g.isFolder,
                        ...(g.filmKey ? { filmKey: g.filmKey, filmTitle: data.movies?.[g.filmKey]?.title || g.filmKey, canRemoveFilm: film!.ok, keepFilmWhy: film!.ok ? null : (film as any).why } : {}),
                    };
                }),
                keptVideos, filmsInUse, filmsNotInUse, totalObjects,
            });
        }

        if (action === 'delete') {
            const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 5000) : [];
            if (ids.length === 0) return json({ error: 'Nothing selected.' }, 400);
            const { groups, store, data } = await currentPlan();
            const byId = new Map(groups.map(g => [g.id, g]));
            const chosen = ids.map(id => byId.get(id)).filter((g): g is NonNullable<typeof g> => !!g);
            const keys = chosen.flatMap(g => g.keys);
            const skipped = ids.length - chosen.length; // now in use again, or already gone

            let deleted = 0;
            const errors: string[] = [];
            const failedKeys = new Set<string>();
            for (let i = 0; i < keys.length; i += 1000) {
                const batch = keys.slice(i, i + 1000);
                const res = await store.client.send(new DeleteObjectsCommand({ Bucket: store.bucket, Delete: { Objects: batch.map(Key => ({ Key })), Quiet: false } }));
                deleted += (res.Deleted || []).length;
                for (const e of res.Errors || []) { errors.push(`${e.Key}: ${e.Message}`); if (e.Key) failedKeys.add(e.Key); }
            }
            const bytes = chosen.reduce((s, g) => s + g.size, 0);
            const db = getAdminDb();

            // Also remove the hidden films themselves, when asked (and allowed).
            const filmsRemoved: string[] = [];
            const filmsKept: { title: string; why: string }[] = [];
            if (body.removeFilms === true && db) {
                // Only films whose video files really went.
                const filmKeys = [...new Set(chosen.filter(g => g.filmKey && !g.keys.some(k => failedKeys.has(k))).map(g => g.filmKey!))];
                const earned = filmKeys.length ? await earnedByTitle(db, data) : {};
                const now = Date.now();
                const cats = filmKeys.length ? await db.collection('categories').get() : null;
                for (const key of filmKeys) {
                    const title = data.movies?.[key]?.title || key;
                    const check = catalogRemoval(key, data, earned, now);
                    if (!check.ok) { filmsKept.push({ title, why: check.why }); continue; }
                    try {
                        const batch = db.batch();
                        batch.delete(db.collection('movies').doc(key));
                        cats?.forEach(c => { if ((c.data()?.movieKeys || []).includes(key)) batch.update(c.ref, { movieKeys: FieldValue.arrayRemove(key) }); });
                        await batch.commit();
                        filmsRemoved.push(title);
                    } catch (e) {
                        console.error('[admin-storage-cleanup] could not remove film', key, e);
                        filmsKept.push({ title, why: "couldn't be removed just now" });
                    }
                }
                if (filmsRemoved.length) {
                    await assembleAndSyncMasterData(db).catch(e => console.error('[admin-storage-cleanup] republish failed', e));
                    await db.collection('audit_logs').add({
                        action: 'STORAGE_CLEANUP_FILMS_REMOVED', type: 'CONTENT', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(),
                        details: `Removed ${filmsRemoved.length} hidden film(s) from the catalog with their videos: ${filmsRemoved.join(', ').slice(0, 1800)}`,
                    }).catch(() => {});
                }
            }
            await db?.collection('audit_logs').add({
                action: 'STORAGE_CLEANUP', type: 'CONTENT', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(),
                details: `Deleted ${deleted} file(s), ${(bytes / 1024 ** 3).toFixed(2)} GB: ${chosen.map(g => g.id).join(', ').slice(0, 1800)}`,
            }).catch(() => {});
            return json({ deleted, rows: chosen.length, skipped, bytes, errors: errors.slice(0, 20), filmsRemoved, filmsKept });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-storage-cleanup]', e);
        return json({ error: (e as Error).message || 'Storage clean-up failed.' }, 500);
    }
}
