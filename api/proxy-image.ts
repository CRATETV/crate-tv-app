import sharp from 'sharp';

// PERF: Converts every poster/image to WebP on first request.
// WebP is 30-50% smaller than JPG at the same visual quality.
// Vercel Edge caches the converted WebP for 1 year — subsequent requests
// are served instantly from the edge without hitting this function at all.

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let imageUrl = searchParams.get('url');

        if (!imageUrl || (!imageUrl.includes('.s3.') && !imageUrl.includes('.amazonaws.com'))) {
            return new Response('A valid S3 image URL is required.', { status: 400 });
        }

        // Clean up the URL
        imageUrl = imageUrl.trim().replace(/\s/g, '%20').replace(/'/g, '%27');

        // Route through CloudFront if configured (faster source fetch)
        const cfDomain = process.env.CLOUDFRONT_DOMAIN;
        const sourceUrl = cfDomain
            ? imageUrl.replace(
                /https?:\/\/[a-z0-9-]+\.s3[a-z0-9.-]*\.amazonaws\.com/gi,
                `https://${cfDomain}`
              )
            : imageUrl;

        const imageResponse = await fetch(sourceUrl);
        if (!imageResponse.ok) {
            return new Response(`Failed to fetch image. Status: ${imageResponse.status}`, {
                status: imageResponse.status
            });
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const contentType = imageResponse.headers.get('Content-Type') || '';

        // Skip conversion for SVGs and GIFs
        if (contentType.includes('svg') || contentType.includes('gif')) {
            return new Response(imageBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // Convert to WebP — 75% quality gives great visuals at ~40% smaller file size
        const webpBuffer = await sharp(imageBuffer)
            .webp({ quality: 75 })
            .toBuffer();

        return new Response(webpBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/webp',
                // Cache for 1 year at Vercel Edge — after first conversion, all
                // subsequent requests are served instantly with zero function invocation
                'Cache-Control': 'public, s-maxage=31536000, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
                'X-Image-Optimized': 'webp',
            },
        });

    } catch (error) {
        console.error('Error in image proxy:', error);
        return new Response('Internal server error.', { status: 500 });
    }
}
