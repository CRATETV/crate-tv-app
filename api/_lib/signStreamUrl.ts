import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';

// 8 hours. Was 4: a viewer who opened a lobby early and then watched a long
// feature could outlast the link mid-film (the player re-requests byte ranges
// as it plays). Still short enough that a shared link goes dead the same day.
const STREAM_URL_TTL_SECONDS = 8 * 60 * 60;
const SIGN_REUSE_MS = 30 * 60 * 1000;
let s3Client: S3Client | null = null;
const signedCache = new Map<string, { value: { url: string; expiresAt: string }; madeAt: number }>();

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

    // Streaming (HLS) films, when switched on: hand out the CloudFront address
    // instead of a signed storage link, so the pieces come from a server near the
    // viewer (Tobago, and everywhere else) instead of one region in the US. The
    // pieces were already loaded without a signature (they sit next to the playlist),
    // so nothing becomes more public. Off until HLS_VIA_CLOUDFRONT=1 is set in Vercel.
    if (process.env.HLS_VIA_CLOUDFRONT === '1' && /\.m3u8$/i.test(key)) {
        const domain = process.env.CLOUDFRONT_VIDEO_DOMAIN || 'd2sbutzk4qyhiw.cloudfront.net';
        return { url: `https://${domain}/${key.split('/').map(encodeURIComponent).join('/')}`, expiresAt: new Date(Date.now() + STREAM_URL_TTL_SECONDS * 1000).toISOString() };
    }

    // The Roku feed signs the same film several times per request (once per row it
    // appears in). A signed link lasts 8 hours, so reuse one for up to 30 minutes.
    const hit = signedCache.get(key);
    if (hit && Date.now() - hit.madeAt < SIGN_REUSE_MS) return hit.value;

    s3Client ??= new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const url = await s3GetSignedUrl(s3Client, command, { expiresIn: STREAM_URL_TTL_SECONDS });

    const value = { url, expiresAt: new Date(Date.now() + STREAM_URL_TTL_SECONDS * 1000).toISOString() };
    signedCache.set(key, { value, madeAt: Date.now() });
    if (signedCache.size > 500) signedCache.clear();
    return value;
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
