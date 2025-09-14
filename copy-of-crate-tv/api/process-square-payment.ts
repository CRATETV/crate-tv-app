// This is a Vercel Serverless Function
// It will be accessible at the path /api/process-square-payment
import { Client, Environment } from 'square';
import { randomUUID } from 'crypto';

// Initialize the Square client
const { paymentsApi } = new Client({
  environment: Environment.Production, // Use Environment.Sandbox for testing
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export async function POST(request: Request) {
  try {
    const { sourceId, amount, currency, itemName } = await request.json();

    if (!sourceId || !amount || !currency || !itemName) {
      return new Response(JSON.stringify({ error: 'Missing required payment information.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert amount to the smallest currency unit (e.g., cents for USD)
    const amountInCents = BigInt(Math.round(amount * 100));

    const response = await paymentsApi.createPayment({
      sourceId,
      idempotencyKey: randomUUID(), // Ensures the request is not processed multiple times
      amountMoney: {
        amount: amountInCents,
        currency: currency,
      },
      note: `Crate TV Purchase: ${itemName}`,
    });
    
    // Check if the payment was successful
    const paymentStatus = response.result.payment?.status;
    if (paymentStatus === 'COMPLETED') {
        return new Response(JSON.stringify({ success: true, payment: response.result.payment }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        // Handle other statuses like PENDING, FAILED, CANCELED
        const errorMessage = 'Payment failed or was declined.';
        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
            status: 402, // Payment Required (but failed)
            headers: { 'Content-Type': 'application/json' },
        });
    }

  } catch (error: any) {
    console.error('Square payment processing error:', error);

    // Extract more detailed error messages from the Square API response if available
    let errorMessage = 'Failed to process payment.';
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        errorMessage = error.errors.map((e: any) => e.detail).join('; ');
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}