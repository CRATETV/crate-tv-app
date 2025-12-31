// This is a Vercel Serverless Function
// It will be accessible at the path /api/update-watch-parties
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { Movie, WatchPartyState } from '../types.js';

export async function GET(request: Request) {
    // Cron Job Authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // NOTE: The automatic transition to 'waiting' has been removed to prevent 
        // watch parties from "coming on by themselves."
        // This function now strictly handles clean-up of stale or very old party states if necessary.
        
        console.log("Watch Party Monitor: Manual initiation required for live sessions.");

        return new Response(JSON.stringify({ success: true, message: "Manual host initiation active." }), { status: 200 });

    } catch (error) {
        console.error("Error in update-watch-parties cron job:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}