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

    /**
     * CRITICAL FIX: Removed .replace(/\+/g, '%20'). 
     * In S3 object keys, a '+' character is literal. 
     * Replacing it with '%20' (space) was causing 404s for files like "Fighter+.webp".
     * Standard fetch handles the literal '+' correctly for S3.
     */
    const correctedImageUrl = imageUrl
        .replace(/\s/g, '%20') // Re-encode actual spaces
        .replace(/'/g, '%27'); // Re-encode apostrophes

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