// This is a Vercel Serverless Function
// It will be accessible at the path /api/proxy-image
//
// NOTE: For standard image display, the app now uses Vercel Image Optimization
// (/_vercel/image) which is faster and CDN-cached automatically.
// This proxy is retained for canvas operations (SocialKit, shareable images)
// that need raw image bytes with CORS headers.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');

    // SECURITY: Only allow S3 URLs from our infrastructure
    if (!imageUrl || (!imageUrl.includes('.s3.') && !imageUrl.includes('.amazonaws.com'))) {
      return new Response('A valid S3 image URL is required.', { status: 400 });
    }

    imageUrl = imageUrl.trim()
      .replace(/\s/g, '%20')
      .replace(/'/g, '%27');

    const imageResponse = await fetch(imageUrl, {
      headers: {
        // Ask S3 for content-type info
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!imageResponse.ok) {
      console.error(`Proxy failed: ${imageUrl}, Status: ${imageResponse.status}`);
      return new Response(`Failed to fetch image. Status: ${imageResponse.status}`, { status: imageResponse.status });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // 30-day CDN cache + 1-day stale-while-revalidate
        'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Vary': 'Accept',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Internal server error.', { status: 500 });
  }
}
