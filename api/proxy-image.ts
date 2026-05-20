// CRATE TV — Reliable Image Proxy
// Removed sharp/WebP conversion (caused blank images on iOS Safari).
// Images now serve directly through CloudFront CDN — fast, reliable, works on all devices.
// WebP conversion can be added back later via CloudFront image optimization.

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return new Response('Image URL is required.', { status: 400 });
        }

        // Normalize URL — S3 sometimes uses + for spaces in filenames, CloudFront needs %20
        const urlParts = imageUrl.trim().split('?');
        urlParts[0] = urlParts[0].replace(/\+/g, '%20').replace(/ /g, '%20');
        imageUrl = urlParts.join('?');

        // Route through CloudFront if configured — serves from nearest edge worldwide
        const cfDomain = process.env.CLOUDFRONT_DOMAIN;
        if (cfDomain && (imageUrl.includes('.s3.') || imageUrl.includes('.amazonaws.com'))) {
            const cdnUrl = imageUrl.replace(
                /https?:\/\/[a-z0-9-]+\.s3[a-z0-9.-]*\.amazonaws\.com/gi,
                `https://${cfDomain}`
            );
            // Direct redirect to CDN — no serverless function overhead after this
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': cdnUrl,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // Fallback: fetch and proxy the image directly
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const imageResponse = await fetch(imageUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!imageResponse.ok) {
            return new Response(`Image fetch failed: ${imageResponse.status}`, {
                status: imageResponse.status
            });
        }

        const buffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, s-maxage=604800, max-age=604800, immutable',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
            },
        });

    } catch (error: any) {
        if (error?.name === 'AbortError') {
            return new Response('Image load timed out.', { status: 504 });
        }
        console.error('proxy-image error:', error);
        return new Response('Internal server error.', { status: 500 });
    }
}
