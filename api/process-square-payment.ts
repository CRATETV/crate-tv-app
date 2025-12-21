
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Server-side base price map (can be overridden by client for specific types like tickets)
const priceMap: Record<string, number> = {
  subscription: 499,
  pass: 5000,
  block: 1000,
  movie: 500,
};

// Helper to get IP address from request headers
const getIp = (req: Request) => {
    const xff = req.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0].trim() : null;
    const vercelIp = req.headers.get('x-vercel-forwarded-for');
    return vercelIp || ip;
};

export async function POST(request: Request) {
  const ip = getIp(request);
  try {
    const { sourceId, amount, movieTitle, directorName, paymentType, itemId, blockTitle, email } = await request.json();
    
    const isProduction = process.env.VERCEL_ENV === 'production';
    
    const accessToken = isProduction
      ? process.env.SQUARE_ACCESS_TOKEN
      : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    
    const locationId = isProduction
      ? process.env.SQUARE_LOCATION_ID
      : process.env.SQUARE_SANDBOX_LOCATION_ID;

    if (!accessToken || !locationId) {
      throw new Error(`Square payments are not configured on the server for the current environment.`);
    }

    if (!sourceId || !paymentType) {
      return new Response(JSON.stringify({ error: "Missing required payment information." }), { status: 400 });
    }

    const idempotencyKey = randomUUID();
    let amountInCents: number;
    let note: string;

    // Use dynamic amount if provided (for tickets/donations/deposits)
    if (['donation', 'billSavingsDeposit', 'watchPartyTicket'].includes(paymentType)) {
        amountInCents = Math.round(Number(amount) * 100);
        if (amountInCents < 100) throw new Error("Amount must be at least $1.00.");
        
        if (paymentType === 'donation') {
            note = `Support for film: "${movieTitle}" by ${directorName}`;
        } else if (paymentType === 'watchPartyTicket') {
            note = `Watch Party Ticket: "${movieTitle}"`;
        } else {
            note = 'Deposit to Crate TV Bill Savings Pot';
        }
    } else if (priceMap[paymentType]) {
        amountInCents = priceMap[paymentType];
        switch(paymentType) {
            case 'subscription': note = 'Crate TV Premium Subscription'; break;
            case 'pass': note = 'Crate TV Film Festival - All-Access Pass'; break;
            case 'block': note = `Crate TV Film Festival - Unlock Block: "${blockTitle || itemId}"`; break;
            case 'movie': note = `Crate TV - Purchase Film: "${movieTitle || itemId}"`; break;
            default: note = "Crate TV Purchase";
        }
    } else {
        throw new Error("Invalid payment type specified.");
    }

    const body = JSON.stringify({
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      location_id: locationId,
      amount_money: { amount: amountInCents, currency: 'USD' },
      note: note,
    });

    const squareUrl = isProduction 
      ? 'https://connect.squareup.com/v2/payments' 
      : 'https://connect.squareupsandbox.com/v2/payments';

    const response = await fetch(squareUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2023-10-18',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body,
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || 'Payment failed.';
        // Log failed payment attempt for security analysis
        const initError = getInitializationError();
        if (!initError) {
            const db = getAdminDb();
            if (db) {
                await db.collection('security_events').add({
                    type: 'FAILED_PAYMENT',
                    ip,
                    timestamp: FieldValue.serverTimestamp(),
                    details: {
                        error: errorMessage,
                        amount: amountInCents,
                        paymentType,
                        userAgent: request.headers.get('user-agent'),
                    }
                });
            }
        }
        throw new Error(errorMessage);
    }

    return new Response(JSON.stringify({ success: true, payment: data.payment }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error("Square Payment Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
