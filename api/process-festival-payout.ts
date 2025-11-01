// This is a Vercel Serverless Function
// It will be accessible at the path /api/process-festival-payout
import { randomUUID } from 'crypto';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

interface SquarePayment {
  amount_money: { amount: number };
  note?: string;
}

const parseNote = (note: string | undefined): { type: string } => {
    if (!note) return { type: 'unknown' };
    if (note.match(/All-Access Pass/)) return { type: 'pass' };
    if (note.match(/Unlock Block:/)) return { type: 'block' };
    return { type: 'other' };
}

async function fetchSquareFestivalPayments(accessToken: string, locationId: string | undefined): Promise<SquarePayment[]> {
    const squareUrlBase = process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    let allPayments: SquarePayment[] = [];
    let cursor: string | undefined = undefined;

    do {
        const url = new URL(`${squareUrlBase}/v2/payments`);
        url.searchParams.append('begin_time', '2020-01-01T00:00:00Z');
        if (locationId) url.searchParams.append('location_id', locationId);
        if (cursor) url.searchParams.append('cursor', cursor);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) throw new Error('Failed to fetch payments from Square.');
        const data = await response.json();
        if (data.payments && Array.isArray(data.payments)) {
            allPayments.push(...data.payments);
        }
        cursor = data.cursor;
    } while (cursor);
    
    // Filter for only festival-related payments server-side
    return allPayments.filter(p => {
        const details = parseNote(p.note);
        return details.type === 'pass' || details.type === 'block';
    });
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // --- Authentication ---
    if (password !== process.env.ADMIN_PASSWORD && password !== process.env.ADMIN_MASTER_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // --- Config & Variable Checks ---
    const isProduction = process.env.VERCEL_ENV === 'production';
    const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;
    const recipientId = process.env.SQUARE_PLAYHOUSE_WEST_RECIPIENT_ID;

    if (!accessToken || !locationId || !recipientId) {
        throw new Error('Server is missing required Square configuration for payouts (Token, Location, or Recipient ID).');
    }

    // --- Firebase Init ---
    const initError = getInitializationError();
    if (initError) throw new Error(`Firebase connection failed: ${initError}`);
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");

    // --- Recalculate Revenue Server-Side ---
    const festivalPayments = await fetchSquareFestivalPayments(accessToken, locationId);
    const totalFestivalRevenue = festivalPayments.reduce((sum, p) => sum + p.amount_money.amount, 0);
    const payoutAmount = Math.round(totalFestivalRevenue * 0.70);

    if (payoutAmount <= 100) { // Minimum payout of $1.00
        return new Response(JSON.stringify({ message: 'Payout amount is too low to process.' }), { status: 200 });
    }

    // --- Execute Square Payout ---
    const idempotencyKey = randomUUID();
    const squareUrl = isProduction ? 'https://connect.squareup.com/v2/payouts' : 'https://connect.squareupsandbox.com/v2/payouts';

    const payoutResponse = await fetch(squareUrl, {
        method: 'POST',
        headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            idempotency_key: idempotencyKey,
            location_id: locationId,
            recipient: { id: recipientId, type: 'BANK_ACCOUNT' }, // Assuming bank account recipient
            amount_money: { amount: payoutAmount, currency: 'USD' },
        }),
    });

    const payoutData = await payoutResponse.json();
    if (!payoutResponse.ok) {
        throw new Error(payoutData.errors?.[0]?.detail || 'Square Payout API returned an error.');
    }

    // --- Log Payout in Firestore ---
    await db.collection('payout_history').add({
        recipient: 'Playhouse West',
        amount: payoutAmount,
        status: payoutData.payout.status,
        squarePayoutId: payoutData.payout.id,
        processedAt: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ success: true, message: `Payout of $${(payoutAmount / 100).toFixed(2)} to Playhouse West initiated successfully.` }), { status: 200 });

  } catch (error) {
    console.error("Error processing festival payout:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
