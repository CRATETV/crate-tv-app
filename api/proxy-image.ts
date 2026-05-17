// PERF FIX: If CloudFront is configured, redirect directly to CDN edge node.
// Eliminates the serverless function proxy hop for every image — huge speed win.
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let imageUrl = searchParams.get('url');

        if (!imageUrl || (!imageUrl.includes('.s3.') && !imageUrl.includes('.amazonaws.com'))) {
            return new Response('A valid S3 image URL is required.', { status: 400 });
        }

        imageUrl = imageUrl.trim().replace(/\s/g, '%20').replace(/'/g, '%27');

        // If CloudFront is configured, redirect to CDN instead of proxying.
        // Browser loads the image directly from the nearest edge node worldwide.
        const cfDomain = process.env.CLOUDFRONT_DOMAIN;
        if (cfDomain) {
            const cdnUrl = imageUrl.replace(
                /https?:\/\/[a-z0-9-]+\.s3[a-z0-9.-]*\.amazonaws\.com/gi,
                `https://${cfDomain}`
            );
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': cdnUrl,
                    'Cache-Control': 'public, max-age=604800, immutable',
                },
            });
        }

        // Fallback: original proxy behaviour when CloudFront is not configured
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            return new Response(`Failed to fetch image. Status: ${imageResponse.status}`, { status: imageResponse.status });
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('Content-Type') || 'application/octet-stream';

        return new Response(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=604800, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('Error in image proxy:', error);
        return new Response('Internal server error.', { status: 500 });
    }
}
