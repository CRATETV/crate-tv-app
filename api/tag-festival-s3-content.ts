// Applies an S3 cost-allocation tag to every object (HLS playlist + every
// video segment, not just the .m3u8) backing the current festival's films,
// so AWS Cost Explorer can report festival-specific bandwidth/storage in
// isolation from the rest of the catalog — the two share the same bucket
// and CloudFront distribution otherwise, with no way to tell them apart in
// billing after the fact. Call this once near the start of a festival
// (once films are uploaded) with that year's tag value, e.g.
// "festival-pwff-2027". A NEW tag value needs to be re-activated as a cost
// allocation tag in AWS Billing (aws ce update-cost-allocation-tags-status)
// the first time it's used — AWS needs to "see" a tag on a real resource
// before it can be activated, and there's typically a delay (in practice,
// up to 24h) before a newly-tagged key becomes available to activate.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { S3Client, ListObjectsV2Command, PutObjectTaggingCommand } from '@aws-sdk/client-s3';
import { Movie } from '../types.js';

const TAG_KEY = 'crate-content';

function s3KeyFromUrl(url: string): string | null {
    try {
        const path = decodeURIComponent(new URL(url).pathname).replace(/^\//, '');
        return path || null;
    } catch {
        return null;
    }
}

function folderPrefix(key: string): string {
    const idx = key.lastIndexOf('/');
    return idx === -1 ? '' : key.slice(0, idx + 1);
}

export async function POST(request: Request) {
    try {
        const { tagValue, password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if ((primaryAdminPassword && password === primaryAdminPassword) || (masterPassword && password === masterPassword)) {
            isAuthenticated = true;
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!tagValue || typeof tagValue !== 'string') {
            return new Response(JSON.stringify({ error: 'tagValue required, e.g. "festival-pwff-2027"' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME not configured');

        // Every movie currently tied to a festival block, same membership
        // check used elsewhere (auto-unlist cron, revenue attribution).
        const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
        const movieKeys = new Set<string>();
        daysSnap.forEach(d => {
            (d.data().blocks || []).forEach((b: any) => (b.movieKeys || []).forEach((k: string) => movieKeys.add(k)));
        });

        if (movieKeys.size === 0) {
            return new Response(JSON.stringify({ error: 'No films currently in the festival schedule.' }), { status: 400 });
        }

        const movieDocs = await Promise.all(Array.from(movieKeys).map(k => db.collection('movies').doc(k).get()));
        const movies = movieDocs.filter(d => d.exists).map(d => d.data() as Movie);

        const prefixes = new Set<string>();
        for (const movie of movies) {
            for (const url of [movie.fullMovie, movie.trailer]) {
                if (!url) continue;
                const key = s3KeyFromUrl(url);
                if (!key || !key.includes(`${bucketName}`) && !url.includes('amazonaws.com') && !url.includes('cloudfront.net')) continue;
                const prefix = folderPrefix(key);
                if (prefix) prefixes.add(prefix);
            }
        }

        const region = (process.env.AWS_S3_REGION || 'us-east-1').replace('global', 'us-east-1');
        const s3 = new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
            requestChecksumCalculation: 'WHEN_REQUIRED',
        });

        const allKeys: string[] = [];
        for (const prefix of prefixes) {
            let continuationToken: string | undefined;
            do {
                const res = await s3.send(new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                }));
                (res.Contents || []).forEach(o => { if (o.Key) allKeys.push(o.Key); });
                continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
            } while (continuationToken);
        }

        let tagged = 0;
        const failed: string[] = [];
        const CONCURRENCY = 20;
        for (let i = 0; i < allKeys.length; i += CONCURRENCY) {
            const batch = allKeys.slice(i, i + CONCURRENCY);
            const results = await Promise.allSettled(batch.map(key =>
                s3.send(new PutObjectTaggingCommand({
                    Bucket: bucketName,
                    Key: key,
                    Tagging: { TagSet: [{ Key: TAG_KEY, Value: tagValue }] },
                }))
            ));
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled') tagged++;
                else failed.push(batch[idx]);
            });
        }

        return new Response(JSON.stringify({
            success: true,
            filmsProcessed: movies.length,
            foldersFound: prefixes.size,
            objectsTagged: tagged,
            objectsFailed: failed.length,
            failedSample: failed.slice(0, 10),
            tagKey: TAG_KEY,
            tagValue,
            note: 'If this tagValue has never been used before, activate it as a cost allocation tag in AWS Billing once it appears (can take up to ~24h after first use): aws ce update-cost-allocation-tags-status --cost-allocation-tags-status TagKey="crate-content",Status="Active"',
        }), { status: 200 });

    } catch (error) {
        console.error('[tag-festival-s3-content] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
