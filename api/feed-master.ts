// api/feed-master.ts

// This is a Vercel Serverless Function using the Node.js runtime.
// It will be accessible at the path /api/feed-master

export default function handler(req: any, res: any) {
    try {
        // Reliably construct the base URL from headers.
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers['host'];

        if (!host) {
            throw new Error("Could not determine host from request headers.");
        }
        
        const moviesFeedUrl = `${protocol}://${host}/api/feed-movies`;

        const masterFeed = {
            providerName: "Crate TV",
            lastUpdated: new Date().toISOString(),
            language: "en-US",
            feeds: [
                {
                    // This type MUST match the key used in the content feed.
                    type: "shortFormVideos", 
                    url: moviesFeedUrl
                }
            ]
        };

        res.status(200).json(masterFeed);

    } catch (error) {
        console.error('Error generating master feed:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ error: `Failed to generate feed: ${errorMessage}` });
    }
}
