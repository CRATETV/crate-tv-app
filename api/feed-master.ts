// api/feed-master.ts

// This is a Vercel Serverless Function
// It will be accessible at the path /api/feed/master

export async function GET(request: Request) {
    // We need to construct the full URL for the movies feed.
    // The TV app will need an absolute URL.
    const requestUrl = new URL(request.url);
    const moviesFeedUrl = `${requestUrl.protocol}//${requestUrl.host}/api/feed-movies`;

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
