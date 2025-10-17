// This is a Vercel Serverless Function to process payments with Square.
import { randomUUID } from 'crypto';

// Server-side price map in cents for security.
// This prevents users from manipulating prices on the client-side.
const priceMap: Record<string, number> = {
  subscription: 499,  // $4.99
  pass: 5000,         // $50.00
  block: 1000,        // $10.00
};

export async function POST(request: Request) {
  try {
    const { sourceId, amount, movieTitle, directorName, paymentType } = await request.json();
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error("Square Access Token is not configured on the server.");
    }

    if (!sourceId || !paymentType) {
      return new Response(JSON.stringify({ error: "Missing required payment information." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idempotencyKey = randomUUID();
    let amountInCents: number;
    let note: string;

    // Determine amount and note based on payment type, using server-side pricing.
    if (paymentType === 'donation') {
        amountInCents = Math.round(Number(amount) * 100);
        if (amountInCents < 100) { // Minimum $1.00 donation
            throw new Error("Donation amount must be at least $1.00.");
        }
        note = `Support for film: ${movieTitle} by ${directorName}`;
    } else if (priceMap[paymentType]) {
        amountInCents = priceMap[paymentType];
        switch(paymentType) {
            case 'subscription':
                note = 'Crate TV Premium Subscription';
                break;
            case 'pass':
                note = 'Crate TV Film Festival - All-Access Pass';
                break;
            case 'block':
                note = 'Crate TV Film Festival - Film Block Access';
                break;
            default:
                note = "Crate TV Purchase";
        }
    } else {
        throw new Error("Invalid payment type specified.");
    }

    const body = JSON.stringify({
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      amount_money: {
        amount: amountInCents,
        currency: 'USD',
      },
      note: note,
    });

    const response = await fetch('https://connect.squareup.com/v2/payments', {
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