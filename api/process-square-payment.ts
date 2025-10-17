// This is a Vercel Serverless Function to process payments with Square.
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    const { sourceId, amount, movieTitle, directorName, paymentType } = await request.json();
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error("Square Access Token is not configured on the server.");
    }

    if (!sourceId || !amount) {
      return new Response(JSON.stringify({ error: "Missing required payment information." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idempotencyKey = randomUUID();
    
    // Convert amount from dollars to the smallest currency unit (cents)
    const amountInCents = Math.round(Number(amount) * 100);

    let note = "Crate TV Transaction";
    if (paymentType === 'donation' && movieTitle) {
        note = `Support for film: ${movieTitle} by ${directorName}`;
    } else if (paymentType === 'subscription') {
        note = 'Crate TV Premium Subscription';
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