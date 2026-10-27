// api/_lib/filmRemoval.ts — server side of removing films from the catalog
// (Oct 2026). Used by Films → "Remove selected" (api/admin-remove-films.ts)
// and Storage clean-up (api/admin-storage-cleanup.ts). Which films may go is
// decided by filmRemovalCheck / catalogRemoval in ./storageCleanup.ts.
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { fetchAllRelevantPayments, getSquareCredentials, computeRevenueByFilm } from './filmmakerBalance.js';
import { assembleAndSyncMasterData } from '../publish-data.js';
import type { BucketObject } from './storageCleanup.js';

export function bucketStore(): { client: S3Client; bucket: string } | null {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    if (!bucket || !accessKeyId || !secretAccessKey) return null;
    return { client: new S3Client({ region, credentials: { accessKeyId, secretAccessKey } }), bucket };
}

export async function listAllObjects(client: S3Client, bucket: string): Promise<BucketObject[]> {
    const out: BucketObject[] = [];
    let token: string | undefined;
    do {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
        for (const o of page.Contents || []) if (o.Key) out.push({ Key: o.Key, Size: Number(o.Size) || 0, LastModified: o.LastModified?.toISOString() });
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return out;
}

/** Deletes bucket files; returns how many went and which failed. */
export async function deleteKeys(client: S3Client, bucket: string, keys: string[]): Promise<{ deleted: number; failed: Set<string>; errors: string[] }> {
    let deleted = 0;
    const failed = new Set<string>();
    const errors: string[] = [];
    for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        const res = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map(Key => ({ Key })), Quiet: false } }));
        deleted += (res.Deleted || []).length;
        for (const e of res.Errors || []) { errors.push(`${e.Key}: ${e.Message}`); if (e.Key) failed.add(e.Key); }
    }
    return { deleted, failed, errors };
}

/** Money each film has earned (cents), by lower-case title. Null if Square can't be checked. */
export async function earnedByTitle(db: Firestore | null, data: any): Promise<Record<string, number> | null> {
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
        console.error('[filmRemoval] earnings check failed', e);
        return null;
    }
}

/**
 * Takes films out of the catalog: their records, their place in any rows,
 * their live watch-party entry; then republishes the site data and logs it.
 * Returns the keys actually removed.
 */
export async function removeFilmRecords(db: Firestore, keys: string[], titles: Record<string, string>, source: string): Promise<string[]> {
    if (!keys.length) return [];
    const cats = await db.collection('categories').get();
    const removed: string[] = [];
    for (const key of keys) {
        try {
            const batch = db.batch();
            batch.delete(db.collection('movies').doc(key));
            batch.set(db.collection('data').doc('movies'), { [key]: FieldValue.delete() }, { merge: true });
            cats.forEach(c => { if ((c.data()?.movieKeys || []).includes(key)) batch.update(c.ref, { movieKeys: FieldValue.arrayRemove(key) }); });
            await batch.commit();
            removed.push(key);
        } catch (e) {
            console.error('[filmRemoval] could not remove film', key, e);
        }
    }
    if (removed.length) {
        await assembleAndSyncMasterData(db).catch(e => console.error('[filmRemoval] republish failed', e));
        await db.collection('audit_logs').add({
            action: 'FILMS_REMOVED', type: 'CONTENT', operatorName: 'ADMIN', timestamp: FieldValue.serverTimestamp(),
            details: `${source}: removed ${removed.length} film(s) from the catalog: ${removed.map(k => titles[k] || k).join(', ').slice(0, 1800)}`,
        }).catch(() => {});
    }
    return removed;
}
