
// This is a Vercel Serverless Function
// Path: /api/roku-toggle-watchlist
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const deviceId = formData.get('deviceId') as string;
        const movieKey = formData.get('movieKey') as string;

        if (!deviceId || !movieKey) {
            return new Response(JSON.stringify({ error: 'Device ID and Movie Key are required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(`Firebase Admin connection failed: ${initError}`);
        const db = getAdminDb();
        if (!db) throw new Error("Database connection failed.");

        // Find the user linked to this device
        const linkDoc = await db.collection('roku_links').doc(deviceId).get();
        if (!linkDoc.exists) {
            return new Response(JSON.stringify({ error: 'Device not linked to an account.' }), { status: 403 });
        }
        const uid = linkDoc.data()?.userId;
        if (!uid) {
             return new Response(JSON.stringify({ error: 'Linked account is invalid.' }), { status: 403 });
        }

        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const currentWatchlist = userData?.watchlist || [];

        let newWatchlist;
        if (currentWatchlist.includes(movieKey)) {
            // Remove from watchlist
            newWatchlist = FieldValue.arrayRemove(movieKey);
        } else {
            // Add to watchlist
            newWatchlist = FieldValue.arrayUnion(movieKey);
        }

        await userRef.update({ watchlist: newWatchlist });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Error toggling Roku watchlist:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
