// Admin → Storage clean-up (top admin password only).
//
//   POST { password, action:'scan' }
//        → the video files in the S3 bucket that CRATE doesn't use, one row
//          per film file (an HLS folder is one row), biggest first.
//   POST { password, action:'delete', ids:[...] }
//        → deletes those rows. The server works the list out AGAIN first and
//          only deletes files that are still unused right now: it never
//          trusts the browser's list. Permanent.
//
// What counts as unused, and what is always kept: api/_lib/storageCleanup.ts.
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { FieldValue } from 'firebase-admin/firestore';
import { isMasterAdmin } from './_lib/adminAuth.js';
import { getApiData } from './_lib/data.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { buildPlan, groupPlan, looksLikeRealCatalog, type BucketObject } from './_lib/storageCleanup.js';

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

async function currentPlan() {
    const store = s3();
    if (!store) throw new Error('Storage is not set up on the server.');
    const data = await getApiData({ noCache: true });
    // Never plan deletions from sample data or a half-loaded catalog.
    if (!looksLikeRealCatalog(data)) throw new Error('Could not load the real CRATE catalog right now. Nothing was planned. Try again in a few minutes.');
    const objects = await listAll(store.client, store.bucket);
    const result = buildPlan(objects, data, Date.now());
    return { ...result, groups: groupPlan(result.plan), store, totalObjects: objects.length };
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await isMasterAdmin(body.password))) return json({ error: 'Only the main admin can use storage clean-up.' }, 401);
        const action = String(body.action || 'scan');

        if (action === 'scan') {
            const { groups, keptVideos, filmsInUse, filmsNotInUse, totalObjects } = await currentPlan();
            return json({
                groups: groups.map(g => ({ id: g.id, label: g.label, detail: g.detail, reason: g.reason, size: g.size, files: g.keys.length, isFolder: g.isFolder })),
                keptVideos, filmsInUse, filmsNotInUse, totalObjects,
            });
        }

        if (action === 'delete') {
            const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 5000) : [];
            if (ids.length === 0) return json({ error: 'Nothing selected.' }, 400);
            const { groups, store } = await currentPlan();
            const byId = new Map(groups.map(g => [g.id, g]));
            const chosen = ids.map(id => byId.get(id)).filter((g): g is NonNullable<typeof g> => !!g);
            const keys = chosen.flatMap(g => g.keys);
            const skipped = ids.length - chosen.length; // now in use again, or already gone

            let deleted = 0;
            const errors: string[] = [];
            for (let i = 0; i < keys.length; i += 1000) {
                const batch = keys.slice(i, i + 1000);
                const res = await store.client.send(new DeleteObjectsCommand({ Bucket: store.bucket, Delete: { Objects: batch.map(Key => ({ Key })), Quiet: false } }));
                deleted += (res.Deleted || []).length;
                for (const e of res.Errors || []) errors.push(`${e.Key}: ${e.Message}`);
            }
            const bytes = chosen.reduce((s, g) => s + g.size, 0);
            const db = getAdminDb();
            await db?.collection('audit_logs').add({
                action: 'STORAGE_CLEANUP', type: 'CONTENT', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(),
                details: `Deleted ${deleted} file(s), ${(bytes / 1024 ** 3).toFixed(2)} GB: ${chosen.map(g => g.id).join(', ').slice(0, 1800)}`,
            }).catch(() => {});
            return json({ deleted, rows: chosen.length, skipped, bytes, errors: errors.slice(0, 20) });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-storage-cleanup]', e);
        return json({ error: (e as Error).message || 'Storage clean-up failed.' }, 500);
    }
}
