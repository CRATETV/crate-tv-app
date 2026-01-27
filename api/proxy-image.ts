// This is a Vercel Serverless Function
// It will be accessible at the path /api/proxy-image
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let imageUrl = searchParams.get('url');

    // SECURITY CHECK: Allow any valid Amazon S3 image URL within our infrastructure
    if (!imageUrl || (!imageUrl.includes('.s3.') && !imageUrl.includes('.amazonaws.com'))) {
      return new Response('A valid S3 image URL is required.', { status: 400 });
    }

    // Trim whitespace from the URL which can cause issues.
    imageUrl = imageUrl.trim();

    /**
     * CRITICAL FIX: Standardize encoding for S3 compatibility.
     * Spaces are re-encoded to %20, and literal plus signs are preserved.
     */
    const correctedImageUrl = imageUrl
        .replace(/\s/g, '%20') 
        .replace(/'/g, '%27');

    const imageResponse = await fetch(correctedImageUrl);
    
    if (!imageResponse.ok) {
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
        // Allow caching to improve performance
        'Cache-Control': 'public, max-age=604800, immutable', // Cache for 1 week
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in image proxy:', error);
    return new Response('An internal server error occurred while proxying the image.', { status: 500 });
  }
}