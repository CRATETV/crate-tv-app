// This is a Vercel Serverless Function
// It will be accessible at the path /api/proxy-image
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    // Add a security check to only proxy images from our own S3 bucket
    if (!imageUrl || !imageUrl.startsWith('https://cratetelevision.s3.')) {
      return new Response('A valid Crate TV S3 image URL is required.', { status: 400 });
    }

    // FIX: S3 URLs use %20 for spaces, not '+'. Some URLs in the data are
    // formatted with '+'. This replaces them to ensure the fetch request is valid.
    const correctedImageUrl = imageUrl.replace(/\+/g, '%20');

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