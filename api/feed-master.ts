// api/feed-master.ts

// This is a Vercel Serverless Function
// It will be accessible at the path /api/feed/master

export async function GET(request: Request) {
    // Reliably construct the base URL from headers.
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

    if (!host) {
        return new Response(JSON.stringify({ error: "Could not determine host from request headers." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    
    const moviesFeedUrl = `${protocol}://${host}/api/feed-movies`;

    const masterFeed = {
        providerName: "Crate TV",
        lastUpdated: new Date().toISOString(),
        language: "en-US",
        feeds: [
            {
                type: "movies",
                url: moviesFeedUrl
            }
        ]
    };

    return new Response(JSON.stringify(masterFeed, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
