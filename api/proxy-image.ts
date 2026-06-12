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

    // SECURITY CHECK: Allow any HTTPS URL — block only private/internal addresses
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return new Response('Invalid URL.', { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivate =
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname === '0.0.0.0';

    if (parsedUrl.protocol !== 'https:' || isPrivate) {
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
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Accept-Encoding',
      },
    });

  } catch (error) {
    console.error('Error in image proxy:', error);
    return new Response('Internal server error.', { status: 500 });
  }
}
