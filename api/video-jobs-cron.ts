// Every 10 minutes (vercel.json), for "Upload & convert film":
//   1. Finishes conversions nobody is watching: when MediaConvert is done,
//      the film's video address and runtime are filled in (api/_lib/videoJobs.ts).
//   2. Deletes a film's ORIGINAL upload 7 days after its streaming version
//      was ready (Salome's choice, Oct 26 2026). Only files uploaded through
//      the panel (originals/), only after a successful conversion, and never
//      while a film still plays the original.
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { awsConfig, refreshJob } from './_lib/videoJobs.js';
import { originalDueForDeletion } from './_lib/videoPipeline.js';
import { getApiData } from './_lib/data.js';
import { collectUrls, keysFromUrl, looksLikeRealCatalog } from './_lib/storageCleanup.js';

const DONE = new Set(['COMPLETE', 'ERROR', 'CANCELED']);

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) return new Response('Unauthorized', { status: 401 });
    try {
        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const cfg = awsConfig();
        if (!db || !cfg) return new Response(JSON.stringify({ skipped: 'not configured' }), { status: 200 });

        const snap = await db.collection('video_jobs').orderBy('createdAt', 'desc').limit(100).get();
        const refreshed: string[] = [];
        for (const d of snap.docs) {
            const rec = d.data();
            const unfinished = !DONE.has(rec.status);
            const doneButNotApplied = rec.status === 'COMPLETE' && !rec.appliedAt;
            if (!unfinished && !doneButNotApplied) continue;
            try { const r = await refreshJob(db, cfg, d.id); refreshed.push(`${d.id}:${r.status}`); }
            catch (e) { console.error('[video-jobs-cron] refresh failed', d.id, e); }
        }

        // Originals 7 days after a successful conversion.
        const now = Date.now();
        const candidates = snap.docs
            .map(d => ({ id: d.id, ref: d.ref, ...d.data() } as any))
            .filter(r => r.status === 'COMPLETE' && !r.originalDeletedAt && r.completedAt);
        const deleted: string[] = [];
        if (candidates.length) {
            const data = await getApiData({ noCache: true });
            if (looksLikeRealCatalog(data)) {
                const played = new Set<string>();
                for (const m of Object.values((data as any).movies || {})) for (const u of collectUrls(m)) keysFromUrl(u).forEach(k => played.add(k));
                const s3 = new S3Client({ region: cfg.region, credentials: cfg.credentials });
                for (const r of candidates) {
                    const completedAtMs = typeof r.completedAt?.toMillis === 'function' ? r.completedAt.toMillis() : null;
                    if (!originalDueForDeletion({ status: r.status, completedAtMs, originalDeletedAt: r.originalDeletedAt, source: r.source }, now, played)) continue;
                    try {
                        await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: r.source }));
                        await r.ref.set({ originalDeletedAt: FieldValue.serverTimestamp() }, { merge: true });
                        deleted.push(r.source);
                    } catch (e) { console.error('[video-jobs-cron] delete failed', r.source, e); }
                }
                if (deleted.length) {
                    await db.collection('audit_logs').add({
                        action: 'ORIGINALS_DELETED', type: 'CONTENT', operatorName: 'SYSTEM', timestamp: FieldValue.serverTimestamp(),
                        details: `Deleted ${deleted.length} original upload(s) 7 days after conversion: ${deleted.join(', ').slice(0, 1800)}`,
                    }).catch(() => {});
                }
            }
        }
        return new Response(JSON.stringify({ refreshed, deleted }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        console.error('[video-jobs-cron]', e);
        return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
    }
}
