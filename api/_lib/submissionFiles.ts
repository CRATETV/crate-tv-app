import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getInitializationError } from './firebaseAdmin.js';
import { detectFileKind, FileKind, IMAGE_KINDS, VIDEO_KINDS } from './fileSignature.js';

/**
 * Server-side inspection of files a visitor uploaded to Firebase Storage.
 *
 * The browser uploads straight to the bucket, so by the time we hear about a
 * submission the file is already there. Before we accept it we check the real
 * object: it must be where uploads are allowed to go, the uploader must hold its
 * download token, the size must be sane, and the first bytes must match an
 * image (poster) or video (film) — not an executable or archive in disguise.
 */

export const MAX_POSTER_BYTES = 10 * 1024 * 1024;
export const MAX_FILM_BYTES = 5 * 1024 * 1024 * 1024;

export type UploadRole = 'poster' | 'film';

const ROLE_PREFIX: Record<UploadRole, string> = {
    poster: 'submissions/posters/',
    film: 'submissions/films/',
};

// The parts of the Storage SDK we use — lets tests pass a fake bucket.
export interface FileLike {
    getMetadata(): Promise<[any, ...any[]]>;
    download(options: { start: number; end: number }): Promise<[Buffer, ...any[]]>;
    delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>;
}
export interface BucketLike {
    file(path: string): FileLike;
}

export type InspectResult =
    /** Confirmed: right place, right owner, sane size, real image/video. */
    | { status: 'ok'; path: string; kind: FileKind; size: number }
    /** Definitely not acceptable. `path` is set only when it's safe for us to delete the object. */
    | { status: 'rejected'; message: string; path?: string }
    /** We couldn't check (storage error / not configured). Not the uploader's fault. */
    | { status: 'unverified'; reason: string };

export const storageBucketName = (): string =>
    (process.env.FIREBASE_STORAGE_BUCKET || '').trim().replace(/^["']|["']$/g, '').replace(/^gs:\/\//, '');

export const getSubmissionBucket = (): BucketLike | null => {
    if (getInitializationError()) return null;
    const name = storageBucketName();
    const app = getApps()[0];
    if (!name || !app) return null;
    try {
        return getStorage(app).bucket(name) as unknown as BucketLike;
    } catch {
        return null;
    }
};

/** Pull the object path + download token out of a Firebase Storage download URL. */
export const parseStorageUrl = (href: string): { path: string; token: string } | null => {
    try {
        const url = new URL(href);
        const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
        if (url.hostname !== 'firebasestorage.googleapis.com' || !match) return null;
        return { path: decodeURIComponent(match[1]), token: url.searchParams.get('token') || '' };
    } catch {
        return null;
    }
};

const WRONG_TYPE: Record<UploadRole, string> = {
    poster: "The poster doesn't look like a valid image. Please upload a JPG, PNG, WebP or GIF.",
    film: "The film file doesn't look like a valid video. Please upload an MP4, MOV, WebM, AVI or similar video file.",
};

export async function inspectUpload(bucket: BucketLike, href: string, role: UploadRole): Promise<InspectResult> {
    const parsed = parseStorageUrl(href);
    if (!parsed || !parsed.path.startsWith(ROLE_PREFIX[role]) || parsed.path.includes('..')) {
        return { status: 'rejected', message: `The ${role} link isn't a file uploaded through the submission form.` };
    }
    const file = bucket.file(parsed.path);

    let metadata: any;
    try {
        [metadata] = await file.getMetadata();
    } catch (err: any) {
        if (err?.code === 404) return { status: 'rejected', message: `The ${role} file wasn't found. Please try uploading again.` };
        return { status: 'unverified', reason: `metadata lookup failed: ${err?.message || err}` };
    }

    // Proof of possession: only the uploader is ever handed this token, so a request
    // that can't present it must not be able to make us read — or delete — the object.
    const tokens = String(metadata?.metadata?.firebaseStorageDownloadTokens || '').split(',');
    if (!parsed.token || !tokens.includes(parsed.token)) {
        return { status: 'rejected', message: `The ${role} link isn't valid.` };
    }

    // From here on the object demonstrably belongs to this submission, so it's ours to delete.
    const size = Number(metadata?.size);
    const maxBytes = role === 'poster' ? MAX_POSTER_BYTES : MAX_FILM_BYTES;
    if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
        return { status: 'rejected', path: parsed.path, message: `The ${role} file is empty or too large.` };
    }

    let head: Buffer;
    try {
        [head] = await file.download({ start: 0, end: 63 });
    } catch (err: any) {
        return { status: 'unverified', reason: `could not read file: ${err?.message || err}` };
    }

    const kind = detectFileKind(head);
    const allowed = role === 'poster' ? IMAGE_KINDS : VIDEO_KINDS;
    if (!kind || !allowed.includes(kind)) {
        return { status: 'rejected', path: parsed.path, message: WRONG_TYPE[role] };
    }
    return { status: 'ok', path: parsed.path, kind, size };
}

export async function deleteUpload(bucket: BucketLike, path: string): Promise<void> {
    try {
        await bucket.file(path).delete({ ignoreNotFound: true });
    } catch (err) {
        console.warn('[submissionFiles] could not delete rejected upload:', path, err);
    }
}
