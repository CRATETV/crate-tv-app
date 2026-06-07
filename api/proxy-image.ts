// This is a Vercel Serverless Function
// It will be accessible at the path /api/proxy-image
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new Response('A valid image URL is required.', { status: 400 });
    }

    // Trim whitespace
    imageUrl = imageUrl.trim();

    // SECURITY CHECK: Only allow HTTPS URLs from known image hosting domains
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return new Response('Invalid URL.', { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed =
      parsedUrl.protocol === 'https:' && (
        hostname.includes('.s3.') ||
        hostname.includes('.amazonaws.com') ||
        hostname.includes('.cloudfront.net') ||
        hostname.endsWith('.s3.amazonaws.com')
      );

    if (!isAllowed) {
      return new Response('URL not permitted.', { status: 400 });
    }

    // Standardize encoding for S3 compatibility
    const correctedImageUrl = imageUrl
      .replace(/\s/g, '%20')
      .replace(/'/g, '%27');

    const imageResponse = await fetch(correctedImageUrl);

    if (!imageResponse.ok) {
      console.error(`Proxy failed: ${correctedImageUrl}, Status: ${imageResponse.status}`);
      return new Response(`Failed to fetch image. Status: ${imageResponse.status}`, { status: imageResponse.status });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache at browser (1 year) + Vercel Edge Network (1 year) + stale-while-revalidate
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Accept-Encoding',
      },
    });

  } catch (error) {
    console.error('Error in image proxy:', error);
    return new Response('Internal server error.', { status: 500 });
  }
}
