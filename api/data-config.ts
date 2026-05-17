// PERF FIX: Changed from POST to GET so Vercel Edge can cache it.
// The S3 URL almost never changes — no reason to hit this on every page load.
// Client-side change required: update fetch call from POST to GET.
export async function GET(request: Request) {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        let region = process.env.AWS_S3_REGION;

        if (!bucketName || !region) {
            console.warn('AWS S3 not configured. Client will use fallback data.');
            return new Response(JSON.stringify({ liveDataUrl: null }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, s-maxage=60',
                },
            });
        }

        if (region === 'global') region = 'us-east-1';

        // Use CloudFront domain if set — much faster than direct S3.
        const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
        const liveDataUrl = cloudFrontDomain
            ? `https://${cloudFrontDomain}/live-data.json`
            : `https://${bucketName}.s3.${region}.amazonaws.com/live-data.json`;

        return new Response(JSON.stringify({ liveDataUrl }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // Cache at Vercel's Edge for 1 hour. URL rarely changes.
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
            },
        });

    } catch (error) {
        console.error('Error in data-config:', error);
        return new Response(JSON.stringify({ error: 'Server error.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Keep POST as a deprecated alias so existing clients don't break during transition.
export async function POST(request: Request) {
    return GET(request);
}
