
// This is a Vercel Serverless Function
// It will be accessible at the path /api/update-watch-parties
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

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

        // SECURITY: We no longer auto-transition parties to 'ended' based on time alone.
        // This allows the Admin to host long post-film discussions without the system killing the banner.
        // We only perform a safety cleanup for sessions older than 12 hours.
        
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const partiesSnapshot = await db.collection('watch_parties').where('status', '==', 'live').get();
        
        let cleanedCount = 0;
        const batch = db.batch();
        
        partiesSnapshot.forEach(doc => {
            const data = doc.data();
            const lastUpdated = data.lastUpdated?.toDate();
            
            if (lastUpdated && lastUpdated < twelveHoursAgo) {
                batch.update(doc.ref, { 
                    status: 'ended', 
                    isPlaying: false,
                    lastUpdated: new Date()
                });
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            await batch.commit();
        }

        return new Response(JSON.stringify({ success: true, message: `Active sessions monitored. ${cleanedCount} stale sessions terminated.` }), { status: 200 });

    } catch (error) {
        console.error("Error in update-watch-parties cron job:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
