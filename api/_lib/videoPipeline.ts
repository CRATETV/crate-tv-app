// api/_lib/videoPipeline.ts — upload a film from the admin panel and have
// AWS MediaConvert turn it into streaming chunks (HLS), the same job as
// ops/video/convert-film.sh (1080p / 720p / 360p, 10-second pieces).
//
// Pure helpers (tested in tests/videoPipeline.test.ts); the AWS calls are in
// api/admin-video.ts.

/** Big films go up in 64 MB pieces (S3 allows up to 10,000 pieces). */
export const PART_SIZE = 64 * 1024 * 1024;
export const MAX_PARTS = 10_000;

/** File name safe for S3 keys and MediaConvert: letters, numbers, - _ . only. */
export function safeFileName(name: string): string {
    const trimmed = String(name || '').trim().replace(/\\/g, '/').split('/').pop() || 'film';
    const dot = trimmed.lastIndexOf('.');
    const base = (dot > 0 ? trimmed.slice(0, dot) : trimmed).normalize('NFKD').replace(/[̀-ͯ]/g, '');
    const ext = dot > 0 ? trimmed.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const cleanBase = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80) || 'film';
    return ext ? `${cleanBase}.${ext}` : cleanBase;
}

/** Short folder name for the streaming version: lowercase-with-hyphens. */
export function slugFor(name: string): string {
    return safeFileName(name).replace(/\.[a-z0-9]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'film';
}

export const isAllowedVideoName = (name: string) => /\.(mp4|mov|m4v|mkv|mxf|avi|webm|mpg|mpeg)$/i.test(String(name || ''));

/** How many pieces a file of this size uploads in. */
export const partCount = (bytes: number) => Math.max(1, Math.ceil(bytes / PART_SIZE));

/** Where the streaming version goes, and the address of its main playlist. */
export function hlsOutput(bucket: string, region: string, sourceKey: string, slug: string) {
    const base = (sourceKey.split('/').pop() || 'film').replace(/\.[^.]+$/, '');
    const folder = `hsl/${slug}/`;
    return {
        destination: `s3://${bucket}/${folder}`,
        masterKey: `${folder}${base}.m3u8`,
        masterUrl: `https://${bucket}.s3.${region}.amazonaws.com/${folder}${encodeURIComponent(base)}.m3u8`,
    };
}

/** The MediaConvert job settings: same as ops/video/convert-film.sh. */
export function jobSettings(bucket: string, sourceKey: string, destination: string) {
    return {
        Inputs: [{
            FileInput: `s3://${bucket}/${sourceKey}`,
            AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
        }],
        OutputGroups: [{
            Name: 'Apple HLS',
            OutputGroupSettings: {
                Type: 'HLS_GROUP_SETTINGS',
                HlsGroupSettings: { Destination: destination, SegmentLength: 10, MinSegmentLength: 0 },
            },
            Outputs: [
                { Preset: 'System-Avc_16x9_1080p_29_97fps_8500kbps', NameModifier: '_1080p' },
                { Preset: 'System-Avc_16x9_720p_29_97fps_5000kbps', NameModifier: '_720p' },
                { Preset: 'System-Avc_16x9_360p_29_97fps_600kbps', NameModifier: '_360p' },
            ],
        }],
    };
}

/** Film length in whole minutes (rounded up) from MediaConvert's job details, or null. */
export function minutesFromJob(job: any): number | null {
    const ms = job?.OutputGroupDetails?.[0]?.OutputDetails?.[0]?.DurationInMs;
    return typeof ms === 'number' && ms > 30_000 ? Math.ceil(ms / 60_000) : null;
}

/** How long the original is kept after its streaming version is ready (Salome's choice, Oct 26 2026). */
export const KEEP_ORIGINAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Should this conversion's original file be deleted now? Only after a
 * SUCCESSFUL conversion, 7 days on, only files uploaded through the panel
 * (originals/), once, and never while a film still plays the original.
 */
export function originalDueForDeletion(rec: { status?: string; completedAtMs?: number | null; originalDeletedAt?: unknown; source?: string }, nowMs: number, keysFilmsPlay: Set<string>): boolean {
    if (rec.status !== 'COMPLETE' || rec.originalDeletedAt) return false;
    if (typeof rec.source !== 'string' || !rec.source.startsWith('originals/') || rec.source.includes('..')) return false;
    if (typeof rec.completedAtMs !== 'number' || nowMs - rec.completedAtMs < KEEP_ORIGINAL_MS) return false;
    return !keysFilmsPlay.has(rec.source);
}
