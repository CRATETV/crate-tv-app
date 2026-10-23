// This is a Vercel Serverless Function
// It will be accessible at the path /api/proxy-image
//
// Posters are uploaded at full size (some are several MB and thousands of
// pixels tall). iPads and iPhones have a limited budget for decoded images, so
// a page full of full-size posters made some of them silently never show.
// This proxy now shrinks each image to the width the page asks for (`w`,
// default 1000) and sends WebP when the browser accepts it, JPEG otherwise.
// SVGs and anything sharp can't read are passed through untouched.
import sharp from 'sharp';

const DEFAULT_WIDTH = 1000;
const MIN_WIDTH = 100;
const MAX_WIDTH = 2000;

/** Picks a real image type when S3 sends a vague one (e.g. "binary/octet-stream"). */
export function detectImageType(bytes: Uint8Array, url: string, headerType: string | null): string {
  const t = (headerType || '').toLowerCase();
  if (t.startsWith('image/')) return t.split(';')[0];
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp';
  const head = new TextDecoder().decode(b.slice(0, 512)).toLowerCase();
  if (head.includes('<svg')) return 'image/svg+xml';
  const ext = url.toLowerCase().split('?')[0].match(/\.(\w+)$/)?.[1];
  const byExt: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif' };
  return (ext && byExt[ext]) || 'image/jpeg';
}

export function clampWidth(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');

    // SECURITY CHECK: Allow any valid Amazon S3 image URL within our infrastructure
    if (!imageUrl || (!imageUrl.includes('.s3.') && !imageUrl.includes('.amazonaws.com'))) {
      return new Response('A valid S3 image URL is required.', { status: 400 });
    }

    // Trim whitespace from the URL which can cause issues.
    imageUrl = imageUrl.trim();

    /**
     * CRITICAL FIX: Standardize encoding for S3 compatibility.
     * Spaces are re-encoded to %20, and literal plus signs are preserved.
     */
    const correctedImageUrl = imageUrl
        .replace(/\s/g, '%20')
        .replace(/'/g, '%27');

    const imageResponse = await fetch(correctedImageUrl);

    if (!imageResponse.ok) {
      console.error(`Proxy failed to fetch: ${correctedImageUrl}, Status: ${imageResponse.status}`);
      return new Response(`Failed to fetch image from source. Status: ${imageResponse.status}`, { status: imageResponse.status });
    }

    const original = new Uint8Array(await imageResponse.arrayBuffer());
    const originalType = detectImageType(original, correctedImageUrl, imageResponse.headers.get('Content-Type'));
    const width = clampWidth(searchParams.get('w'));
    const acceptsWebp = (request.headers.get('accept') || '').includes('image/webp');

    let body: Uint8Array = original;
    let contentType = originalType;

    // Vector and animated images stay as they are.
    if (originalType !== 'image/svg+xml' && originalType !== 'image/gif') {
      try {
        const pipeline = sharp(original, { failOn: 'none' })
          .rotate() // respect phone-camera orientation
          .resize({ width, withoutEnlargement: true });
        const out = acceptsWebp
          ? await pipeline.webp({ quality: 80 }).toBuffer()
          : await pipeline.flatten({ background: '#000000' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        body = new Uint8Array(out);
        contentType = acceptsWebp ? 'image/webp' : 'image/jpeg';
      } catch (resizeError) {
        // Can't read it? Send the original rather than nothing.
        console.error('proxy-image: resize failed, sending original', resizeError);
      }
    }

    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Browsers keep it a week; Vercel's CDN keeps it a month.
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
        'Vary': 'Accept',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in image proxy:', error);
    return new Response('An internal server error occurred while proxying the image.', { status: 500 });
  }
}
