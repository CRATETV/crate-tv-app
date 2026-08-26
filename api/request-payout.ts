
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const MINIMUM_PAYOUT_CENTS = 500; // $5.00

export async function POST(request: Request) {
    try {
        const { directorName, amount, email, filmTitles } = await request.json();

        if (!directorName || !amount || !email) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }
        if (typeof amount !== 'number' || amount < MINIMUM_PAYOUT_CENTS) {
            return new Response(JSON.stringify({ error: 'Minimum payout amount is $5.00' }), { status: 400 });
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
            // get-payouts.ts orders by this field — without it, requests
            // written here were silently excluded from that query entirely,
            // not just unrendered (Firestore's orderBy skips docs missing
            // the ordered field).
            requestDate: FieldValue.serverTimestamp(),
        };

        await db.collection('payout_requests').add(payoutRequest);

        return new Response(JSON.stringify({ success: true, message: 'Payout request submitted successfully.' }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
