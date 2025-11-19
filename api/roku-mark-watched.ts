// This is a Vercel Serverless Function
// Path: /api/roku-mark-watched
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

        const linkDoc = await db.collection('roku_links').doc(deviceId).get();
        if (!linkDoc.exists) {
            // Not an error, just can't track. Fail silently for the user.
            return new Response(JSON.stringify({ success: true, message: 'Device not linked, view not tracked.' }), { status: 200 });
        }
        const uid = linkDoc.data()?.userId;
        if (!uid) {
             return new Response(JSON.stringify({ success: true, message: 'Linked account invalid, view not tracked.' }), { status: 200 });
        }

        const userRef = db.collection('users').doc(uid);
        await userRef.update({ watchedMovies: FieldValue.arrayUnion(movieKey) });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Error marking as watched on Roku:", error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
