// Admin → Film editor → "Upload & convert film" (Oct 2026).
//
// The browser uploads the original film straight to S3 in 64 MB pieces
// (big films are many GB), then this asks AWS MediaConvert to make the
// streaming version (HLS: 1080p / 720p / 360p), same settings as
// ops/video/convert-film.sh. When it's done, the film's video address and
// runtime are filled in automatically.
//
//   { action:'setup' }                                   is everything set up on AWS?
//   { action:'start-upload', fileName, contentType, size } → { key, uploadId, partSize, parts }
//   { action:'sign-parts', key, uploadId, partNumbers }    → { urls: { [n]: url } }
//   { action:'complete-upload', key, uploadId, parts }     → { ok }
//   { action:'abort-upload', key, uploadId }
//   { action:'convert', key, movieKey, title }             → { jobId }
//   { action:'status', jobId }                             → { status, percent, masterUrl?, minutes? }
//   { action:'statuses', jobIds }                          → { jobs: { [jobId]: same as status } }  (Bulk upload)
//
// Admin passwords only. Needs on Vercel: the same AWS keys as uploads, plus
// MEDIACONVERT_ROLE_ARN (the role MediaConvert uses to read/write the bucket,
// e.g. arn:aws:iam::<account>:role/MediaConvert_Default_Role).
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { awsConfig, mediaConvert, refreshJob } from './_lib/videoJobs.js';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';
import { safeFileName, slugFor, isAllowedVideoName, partCount, PART_SIZE, MAX_PARTS, hlsOutput, jobSettings } from './_lib/videoPipeline.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const plainAwsError = (e: any): string => {
    const name = e?.name || '';
    if (name === 'AccessDeniedException' || name === 'AccessDenied' || /not authorized|AccessDenied/i.test(e?.message || '')) {
        return 'AWS said no: the key CRATE uses doesn\'t have permission for this yet. See the setup steps.';
    }
    return e?.message || 'AWS request failed.';
};

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        if (!(await verifyAdminPassword(body.password))) return json({ error: 'Unauthorized' }, 401);
        const cfg = awsConfig();
        if (!cfg) return json({ error: 'Storage is not set up on the server.' }, 500);
        const s3 = new S3Client({ region: cfg.region, credentials: cfg.credentials });
        const action = String(body.action || '');

        if (action === 'setup') {
            const problems: string[] = [];
            if (!process.env.MEDIACONVERT_ROLE_ARN) problems.push('MEDIACONVERT_ROLE_ARN is not set in Vercel.');
            try { await mediaConvert(cfg); } catch (e) { problems.push(`MediaConvert: ${plainAwsError(e)}`); }
            return json({ ready: problems.length === 0, problems });
        }

        if (action === 'start-upload') {
            const name = String(body.fileName || '');
            const size = Number(body.size);
            if (!isAllowedVideoName(name)) return json({ error: 'Choose a video file (.mov, .mp4, .mxf, ...).' }, 400);
            if (!Number.isFinite(size) || size <= 0) return json({ error: 'Empty file.' }, 400);
            const parts = partCount(size);
            if (parts > MAX_PARTS) return json({ error: 'That file is too big to upload (over 640 GB).' }, 400);
            const key = `originals/${Date.now()}-${safeFileName(name)}`;
            const contentType = typeof body.contentType === 'string' && body.contentType ? body.contentType.slice(0, 100) : 'application/octet-stream';
            const r = await s3.send(new CreateMultipartUploadCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType }));
            return json({ key, uploadId: r.UploadId, partSize: PART_SIZE, parts });
        }

        const key = typeof body.key === 'string' ? body.key : '';
        const uploadId = typeof body.uploadId === 'string' ? body.uploadId : '';
        // Uploads only ever go into originals/.
        const keyOk = key.startsWith('originals/') && !key.includes('..');

        if (action === 'sign-parts') {
            if (!keyOk || !uploadId) return json({ error: 'Bad upload.' }, 400);
            const nums: number[] = (Array.isArray(body.partNumbers) ? body.partNumbers : []).map(Number).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_PARTS).slice(0, 50);
            const urls: Record<number, string> = {};
            for (const n of nums) {
                urls[n] = await getSignedUrl(s3, new UploadPartCommand({ Bucket: cfg.bucket, Key: key, UploadId: uploadId, PartNumber: n }), { expiresIn: 3600 });
            }
            return json({ urls });
        }

        if (action === 'complete-upload') {
            if (!keyOk || !uploadId) return json({ error: 'Bad upload.' }, 400);
            const parts = (Array.isArray(body.parts) ? body.parts : [])
                .map((p: any) => ({ PartNumber: Number(p?.PartNumber), ETag: String(p?.ETag || '') }))
                .filter((p: any) => Number.isInteger(p.PartNumber) && p.ETag)
                .sort((a: any, b: any) => a.PartNumber - b.PartNumber);
            if (parts.length === 0) return json({ error: 'No pieces uploaded.' }, 400);
            await s3.send(new CompleteMultipartUploadCommand({ Bucket: cfg.bucket, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
            return json({ ok: true });
        }

        if (action === 'abort-upload') {
            if (!keyOk || !uploadId) return json({ ok: true });
            await s3.send(new AbortMultipartUploadCommand({ Bucket: cfg.bucket, Key: key, UploadId: uploadId })).catch(() => {});
            return json({ ok: true });
        }

        if (action === 'convert') {
            if (!keyOk) return json({ error: 'Bad file.' }, 400);
            const role = process.env.MEDIACONVERT_ROLE_ARN;
            if (!role) return json({ error: 'MediaConvert isn\'t set up yet (MEDIACONVERT_ROLE_ARN). See the setup steps.' }, 400);
            const movieKey = typeof body.movieKey === 'string' ? body.movieKey.slice(0, 200) : '';
            const slug = `${slugFor(String(body.title || key.split('/').pop() || 'film'))}-${Date.now().toString(36)}`;
            const out = hlsOutput(cfg.bucket, cfg.region, key, slug);
            const mc = await mediaConvert(cfg);
            const r = await mc.send(new CreateJobCommand({ Role: role, Settings: jobSettings(cfg.bucket, key, out.destination) as any, UserMetadata: { movieKey, source: key } }));
            const jobId = r.Job?.Id;
            if (!jobId) throw new Error('MediaConvert did not start the job.');
            const db = getAdminDb();
            await db?.collection('video_jobs').doc(jobId).set({
                jobId, movieKey, source: key, masterKey: out.masterKey, masterUrl: out.masterUrl, status: 'SUBMITTED',
                createdAt: FieldValue.serverTimestamp(),
            }).catch(() => {});
            return json({ jobId, masterUrl: out.masterUrl });
        }

        if (action === 'status') {
            const jobId = typeof body.jobId === 'string' ? body.jobId.slice(0, 100) : '';
            if (!jobId) return json({ error: 'Missing job.' }, 400);
            return json(await refreshJob(getAdminDb(), cfg, jobId));
        }

        if (action === 'statuses') {
            // Bulk upload: many conversions in one check.
            const ids: string[] = (Array.isArray(body.jobIds) ? body.jobIds : []).filter((j: unknown) => typeof j === 'string' && j).map((j: string) => j.slice(0, 100)).slice(0, 60);
            const db = getAdminDb();
            const out: Record<string, unknown> = {};
            await Promise.all(ids.map(async id => {
                try { out[id] = await refreshJob(db, cfg, id); }
                catch (e) { out[id] = { status: 'UNKNOWN', error: plainAwsError(e) }; }
            }));
            return json({ jobs: out });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[admin-video]', e);
        return json({ error: plainAwsError(e) }, 500);
    }
}
