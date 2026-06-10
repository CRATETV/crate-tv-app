// CRATE TV — Reliable Image Proxy
// Serves images via CloudFront CDN when available (fastest path for mobile).
// Falls back to direct S3 fetch if CloudFront is not configured.
// Handles all S3 URL encoding variations (+, %20, spaces).

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return new Response('Image URL required.', { status: 400 });
        }

        // ── URL normalisation ─────────────────────────────────────────────────
        // Step 1: decode any double-encoding from encodeURIComponent on the frontend
        let decodedUrl = imageUrl.trim();
        try { decodedUrl = decodeURIComponent(decodedUrl); } catch {}

        // Step 2: normalise S3 path encoding
        // + in S3 paths means a space — convert to %20 for CloudFront/fetch compatibility
        const correctedUrl = decodedUrl
            .replace(/\+/g, '%20')
            .replace(/\s/g, '%20')
            .replace(/'/g, '%27');

        // ── Security check ────────────────────────────────────────────────────
        let parsedUrl: URL;
        try { parsedUrl = new URL(correctedUrl); }
        catch { return new Response('Invalid URL.', { status: 400 }); }

        const host = parsedUrl.hostname.toLowerCase();
        const isBlocked =
            host === 'localhost' ||
            host.startsWith('127.') ||
            host.startsWith('10.') ||
            host.startsWith('192.168.') ||
            host === '0.0.0.0';

        if (parsedUrl.protocol !== 'https:' || isBlocked) {
            return new Response('URL not permitted.', { status: 403 });
        }

        // ── CloudFront fast path ──────────────────────────────────────────────
        // If CloudFront is configured, redirect to CDN instead of proxying.
        // Mobile Safari handles 302 redirects perfectly for <img> tags.
        // This eliminates the fetch overhead and serves from the nearest edge node.
        const cfDomain = process.env.CLOUDFRONT_DOMAIN;
        const isS3Url = correctedUrl.includes('.s3.') || correctedUrl.includes('.amazonaws.com');

        if (cfDomain && isS3Url) {
            const cdnUrl = correctedUrl.replace(
                /https?:\/\/[a-z0-9-]+\.s3[a-z0-9.-]*\.amazonaws\.com/gi,
                `https://${cfDomain}`
            );
            return new Response(null, {
                status: 302,
                headers: {
                    'Location': cdnUrl,
                    // Short cache on the redirect itself — the CDN response is cached long-term
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // ── Direct fetch fallback ─────────────────────────────────────────────
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const imageResponse = await fetch(correctedUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!imageResponse.ok) {
            return new Response(`Image not found (${imageResponse.status})`, {
                status: imageResponse.status
            });
        }

        const buffer = await imageResponse.arrayBuffer();

        // Determine correct content type from URL extension if S3 returns generic type
        const urlLower = correctedUrl.toLowerCase();
        let contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';
        if (contentType === 'application/octet-stream' || contentType === 'binary/octet-stream') {
            // Mobile Safari needs correct Content-Type — infer from extension
            if (urlLower.match(/\.(jpg|jpeg)$/)) contentType = 'image/jpeg';
            else if (urlLower.match(/\.png$/)) contentType = 'image/png';
            else if (urlLower.match(/\.webp$/)) contentType = 'image/webp';
            else if (urlLower.match(/\.gif$/)) contentType = 'image/gif';
        }

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                // 1-year cache — images are content-addressed by URL
                // Removed 'Vary: Accept-Encoding' — causes mobile Safari cache conflicts
                'Cache-Control': 'public, max-age=31536000, s-maxage=31536000',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error: any) {
        if (error?.name === 'AbortError') {
            return new Response('Image load timed out.', { status: 504 });
        }
        console.error('proxy-image error:', error);
        return new Response('Error loading image.', { status: 500 });
    }
}
