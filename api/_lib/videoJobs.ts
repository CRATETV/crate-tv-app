// Shared AWS bits for "Upload & convert film": used by the admin panel
// (api/admin-video.ts) and the every-10-minutes job (api/video-jobs-cron.ts),
// which finishes conversions nobody is watching and deletes originals 7 days
// after a successful conversion.
import { MediaConvertClient, GetJobCommand, DescribeEndpointsCommand } from '@aws-sdk/client-mediaconvert';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { assembleAndSyncMasterData } from '../publish-data.js';
import { minutesFromJob } from './videoPipeline.js';

export function awsConfig() {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION || 'us-east-1';
    if (region === 'global') region = 'us-east-1';
    if (!bucket || !accessKeyId || !secretAccessKey) return null;
    return { bucket, region, credentials: { accessKeyId, secretAccessKey } };
}
export type AwsConfig = NonNullable<ReturnType<typeof awsConfig>>;

let cachedEndpoint: string | null = process.env.MEDIACONVERT_ENDPOINT || null;
export async function mediaConvert(cfg: AwsConfig): Promise<MediaConvertClient> {
    if (!cachedEndpoint) {
        const probe = new MediaConvertClient({ region: cfg.region, credentials: cfg.credentials });
        const r = await probe.send(new DescribeEndpointsCommand({ MaxResults: 1 }));
        cachedEndpoint = r.Endpoints?.[0]?.Url || null;
        if (!cachedEndpoint) throw new Error('Could not find your MediaConvert endpoint.');
    }
    return new MediaConvertClient({ region: cfg.region, credentials: cfg.credentials, endpoint: cachedEndpoint });
}

/**
 * Asks MediaConvert how a job is doing, saves it, and when it's finished
 * points the (saved) film at its streaming version and fills in its runtime.
 */
export async function refreshJob(db: Firestore | null, cfg: AwsConfig, jobId: string) {
    const mc = await mediaConvert(cfg);
    const job = (await mc.send(new GetJobCommand({ Id: jobId }))).Job as any;
    const status: string = job?.Status || 'UNKNOWN';
    const ref = db?.collection('video_jobs').doc(jobId);
    const rec = (await ref?.get().catch(() => null))?.data() || {};
    const minutes = minutesFromJob(job);
    const filmSaved = rec.movieKey && db ? (await db.collection('movies').doc(rec.movieKey).get().catch(() => null))?.exists === true : false;
    if (ref && status === 'COMPLETE' && !rec.completedAt) {
        await ref.set({ status, completedAt: FieldValue.serverTimestamp(), minutes: minutes || null }, { merge: true }).catch(() => {});
    }
    if (status === 'COMPLETE' && filmSaved && !rec.appliedAt && db && ref) {
        // A film not saved yet gets it through the editor instead.
        await db.collection('movies').doc(rec.movieKey).set({
            fullMovie: rec.masterUrl,
            ...(minutes ? { durationInMinutes: minutes } : {}),
        }, { merge: true });
        await ref.set({ status, appliedAt: FieldValue.serverTimestamp() }, { merge: true });
        await assembleAndSyncMasterData(db).catch(e => console.error('[videoJobs] republish failed', e));
    } else if (ref && rec.status !== status && status !== 'COMPLETE') {
        await ref.set({ status }, { merge: true }).catch(() => {});
    }
    return {
        status,
        appliedToFilm: status === 'COMPLETE' && filmSaved,
        percent: typeof job?.JobPercentComplete === 'number' ? job.JobPercentComplete : null,
        masterUrl: rec.masterUrl || null,
        minutes,
        error: status === 'ERROR' ? (job?.ErrorMessage || 'MediaConvert could not convert this file.') : null,
    };
}
