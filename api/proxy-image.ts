import sharp from 'sharp';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let imageUrl = searchParams.get('url');

        if (!imageUrl || (!imageUrl.includes('.s3.') && !imageUrl.includes('.amazonaws.com'))) {
            return new Response('A valid S3 image URL is required.', { status: 400 });
        }

        imageUrl = imageUrl.trim().replace(/\s/g, '%20').replace(/'/g, '%27');

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

        if (contentType.includes('svg') || contentType.includes('gif')) {
            return new Response(new Uint8Array(imageBuffer), {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, s-maxage=31536000, max-age=31536000, immutable',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        const webpBuffer = await sharp(imageBuffer)
            .webp({ quality: 75 })
            .toBuffer();

        return new Response(new Uint8Array(webpBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'image/webp',
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
