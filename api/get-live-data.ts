// This is a Vercel Serverless Function
// It will be accessible at the path /api/get-live-data
import { getApiData } from './_lib/data.js';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const noCache = searchParams.get('noCache') === 'true';

        const data = await getApiData({ noCache });
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // Cache on the edge for 1 minute, allow stale for 5 minutes
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
            },
        });
    } catch (error) {
        console.error("Error in /api/get-live-data:", error);
        return new Response(JSON.stringify({ error: 'Failed to fetch application data.' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}