
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const { sourceId, password } = await request.json();

    const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
    const festPassword = process.env.FESTIVAL_ADMIN_PASSWORD;
    if (password !== masterPassword && password !== festPassword) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const isProduction = process.env.VERCEL_ENV === 'production';
    const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    const squareUrl = isProduction ? 'https://connect.squareup.com/v2/customers' : 'https://connect.squareupsandbox.com/v2/customers';

    // 1. Create a Square "Customer" or "Recipient" to hold the card/bank token
    // For Square Payouts, we often onboard as a customer then link the payment source.
    const response = await fetch(squareUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-05-15',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: randomUUID(),
        given_name: 'Festival',
        family_name: 'Partner',
        note: 'Authorized Payout Destination for Crate TV Festival',
        cards: [{ card_nonce: sourceId }]
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.detail || "Square Onboarding Failure.");

    // 2. Securely store ONLY the recipient/customer ID in Firestore
    const initError = getInitializationError();
    const db = getAdminDb();
    if (db) {
        await db.collection('festival').doc('config').set({
            payoutRecipientId: data.customer.id,
            payoutCardId: data.customer.cards?.[0]?.id,
            payoutLastLinked: FieldValue.serverTimestamp()
        }, { merge: true });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
