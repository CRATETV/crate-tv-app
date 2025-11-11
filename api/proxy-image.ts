// This is a Vercel Serverless Function
// It will be accessible at the path /api/proxy-image
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');

    // Add a security check to only proxy images from our own S3 bucket
    if (!imageUrl || !imageUrl.startsWith('https://cratetelevision.s3.')) {
      return new Response('A valid Crate TV S3 image URL is required.', { status: 400 });
    }

    // Trim whitespace from the URL which can cause issues.
    imageUrl = imageUrl.trim();

    // Robustly encode special characters for S3.
    // The browser/server decodes the query param, so we need to re-encode spaces, +, ', etc.
    // before fetching. Using chained replace calls is more reliable than a single regex for this.
    const correctedImageUrl = imageUrl
        .replace(/\+/g, '%20') // Replace '+' with space encoding
        .replace(/\s/g, '%20') // Replace actual spaces with encoding
        .replace(/'/g, '%27'); // Replace apostrophes with encoding

    const imageResponse = await fetch(correctedImageUrl);
    
    if (!imageResponse.ok) {
      // Provide more debug info on failure
      console.error(`Proxy failed to fetch: ${correctedImageUrl}, Status: ${imageResponse.status}`);
      return new Response(`Failed to fetch image from source. Status: ${imageResponse.status}`, { status: imageResponse.status });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('Content-Type') || 'application/octet-stream';

    // Return the image data with appropriate headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Allow caching to reduce server load and improve performance
        'Cache-Control': 'public, max-age=604800, immutable', // Cache for 1 week
        // FIX: Add this header to allow cross-origin use in canvases (for html2canvas)
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in image proxy:', error);
    return new Response('An internal server error occurred while proxying the image.', { status: 500 });
  }
}
