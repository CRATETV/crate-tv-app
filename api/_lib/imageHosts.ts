// api/_lib/imageHosts.ts: which web addresses CRATE's image resizer (api/proxy-image.ts)
// will fetch, and the resized-picture address the Roku channel uses.
// Kept apart from proxy-image.ts so the Roku feed doesn't load the image library.

/** CRATE's own image hosts only: its S3 bucket and its image CDN. */
export function isAllowedImageUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw.replace(/\s/g, '%20')); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const bucket = (process.env.AWS_S3_BUCKET_NAME || 'cratetelevision').toLowerCase();
  const region = (process.env.AWS_S3_REGION && process.env.AWS_S3_REGION !== 'global' ? process.env.AWS_S3_REGION : 'us-east-1').toLowerCase();
  const allowed = new Set([
    `${bucket}.s3.${region}.amazonaws.com`, `${bucket}.s3.amazonaws.com`,
    'cratetelevision.s3.us-east-1.amazonaws.com', 'cratetelevision.s3.amazonaws.com',
    'd3jhtrl1gnrh4b.cloudfront.net',
    ...(process.env.CLOUDFRONT_IMAGE_DOMAIN ? [process.env.CLOUDFRONT_IMAGE_DOMAIN.toLowerCase()] : []),
  ]);
  return allowed.has(u.hostname.toLowerCase());
}

const SITE = 'https://cratetv.net';

/**
 * A right-sized JPEG of one of CRATE's pictures, for the Roku. The Roku used to
 * be sent the original upload (often several megabytes, several thousand pixels
 * wide) for a tile that is 214 pixels wide: slow rows, and a lot of memory
 * for the Roku to decode. Anything not on CRATE's own image hosts, and empty
 * values, are returned unchanged. The resizer's results are kept by the CDN
 * for a month, so only the first viewer waits.
 */
// Sizes the Roku is sent (tiles are ~214 px wide, the home header ~1280 px is
// plenty on a TV): small files load fast, which is what makes rows feel instant.
export const ROKU_POSTER_WIDTH = 640;
export const ROKU_HERO_WIDTH = 1280;

export function rokuImageUrl(raw: string | undefined | null, width: number): string {
    const url = typeof raw === 'string' ? raw.trim() : '';
    if (!url || !isAllowedImageUrl(url)) return url;
    if (/\.(svg|gif)(\?|$)/i.test(url)) return url;
    return `${SITE}/api/proxy-image?url=${encodeURIComponent(url)}&w=${Math.round(width)}&fmt=jpeg`;
}
