import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
    try {
        const { directorName, email, filmTitle, description } = await request.json();

        if (!directorName || !email || !description) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const shopRequest = {
            directorName,
            email,
            filmTitle: filmTitle || '',
            description,
            status: 'pending',
            requestDate: FieldValue.serverTimestamp(),
        };

        await db.collection('shop_requests').add(shopRequest);

        return new Response(JSON.stringify({ success: true, message: 'Request submitted successfully.' }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
