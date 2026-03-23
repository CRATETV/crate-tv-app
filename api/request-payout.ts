
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { directorName, amount, email, filmTitles } = await request.json();

        if (!directorName || !amount || !email) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB fail");

        const payoutRequest = {
            directorName,
            amount,
            email,
            filmTitles: filmTitles || [],
            status: 'pending',
            timestamp: new Date().toISOString(),
            requestedAt: new Date()
        };

        await db.collection('payout_requests').add(payoutRequest);

        return new Response(JSON.stringify({ success: true, message: 'Payout request submitted successfully.' }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
