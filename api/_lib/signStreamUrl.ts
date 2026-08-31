import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';

const STREAM_URL_TTL_SECONDS = 4 * 60 * 60; // 4 hours, matching the prior CloudFront-signed TTL

/**
 * Turns a raw, permanent S3 URL (the shape stored in movie.fullMovie, e.g.
 * https://cratetelevision.s3.us-east-1.amazonaws.com/some+path/file.mp4) into a
 * time-limited presigned GET URL, using the same S3 credentials/bucket already
 * proven working in api/generate-presigned-url.ts (upload direction).
 *
 * Returns null if the URL isn't a recognizable S3 object URL for the configured
 * bucket, or if AWS credentials aren't configured — callers should treat a null
 * result as "cannot serve this stream" rather than falling back to the raw URL.
 */
export async function signStreamUrl(rawUrl: string): Promise<{ url: string; expiresAt: string } | null> {
    if (!rawUrl) return null;

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let region = process.env.AWS_S3_REGION;
    if (!bucketName || !region || !accessKeyId || !secretAccessKey) return null;
    if (region === 'global') region = 'us-east-1';

    const key = extractS3Key(rawUrl, bucketName, region);
    if (!key) return null;

    const s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const url = await s3GetSignedUrl(s3Client, command, { expiresIn: STREAM_URL_TTL_SECONDS });

    return { url, expiresAt: new Date(Date.now() + STREAM_URL_TTL_SECONDS * 1000).toISOString() };
}

/**
 * Pulls the object key back out of a stored fullMovie URL for the configured bucket.
 * Handles three shapes seen in this catalog: virtual-hosted-style S3
 * (bucket.s3.region.amazonaws.com/key), path-style S3 (s3.region.amazonaws.com/bucket/key),
 * and the video CloudFront distribution (CLOUDFRONT_VIDEO_DOMAIN/key) that live movie docs
 * actually use today — CloudFront here is a single-origin passthrough onto this same
 * bucket, so its pathname maps 1:1 onto the S3 key.
 *
 * Decodes percent-encoding (movie filenames can contain accented characters, etc.) so the
 * key passed to GetObjectCommand matches what's actually stored. Confirmed directly against
 * real S3 objects (via HeadObject) that this catalog's stored fullMovie URLs use "+" as an
 * informal stand-in for a literal space in the filename (non-standard for a URL path, but
 * that's what's actually in use here) — "+" must be converted to a space, not left literal.
 */
function extractS3Key(rawUrl: string, bucketName: string, region: string): string | null {
    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch { return null; }

    const host = parsed.hostname;
    const videoCdnDomain = process.env.CLOUDFRONT_VIDEO_DOMAIN || 'd2sbutzk4qyhiw.cloudfront.net';
    const isVirtualHosted = host === `${bucketName}.s3.${region}.amazonaws.com` || host === `${bucketName}.s3.amazonaws.com`;
    const isPathStyle = host === `s3.${region}.amazonaws.com` || host === 's3.amazonaws.com';
    const isVideoCdn = host === videoCdnDomain;

    let pathname = parsed.pathname;
    if (isVirtualHosted || isVideoCdn) {
        // pathname is already just the key path
    } else if (isPathStyle) {
        const prefix = `/${bucketName}/`;
        if (!pathname.startsWith(prefix)) return null;
        pathname = pathname.slice(prefix.length - 1); // keep leading slash for consistent trim below
    } else {
        return null;
    }

    const key = decodeURIComponent(pathname.replace(/^\/+/, '').replace(/\+/g, ' '));
    return key || null;
}
