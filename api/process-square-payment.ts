// This is a Vercel Serverless Function to process payments with Square.
import { randomUUID } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Server-side price map in cents for fixed-price security.
const priceMap: Record<string, number> = {
  subscription: 499,
  pass: 5000,
  block: 1000,
  movie: 500,
};

export async function POST(request: Request) {
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
      throw new Error(`Square configuration is missing on the server.`);
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

    // Determine amount and note based on payment type.
    // 'crateFestPass' is added to the dynamic pricing group so the Admin-set price is honored.
    if (['donation', 'billSavingsDeposit', 'watchPartyTicket', 'crateFestPass'].includes(paymentType)) {
        amountInCents = Math.round(Number(amount) * 100);
        if (amountInCents < 100) { // Minimum $1.00
            throw new Error("Amount must be at least $1.00.");
        }
        
        if (paymentType === 'donation') {
            note = `Support for film: "${movieTitle}" by ${directorName}`;
        } else if (paymentType === 'crateFestPass') {
            // Note must match the pattern in get-sales-data.ts for revenue tracking
            note = 'Crate Fest 2026 Pass Access';
        } else {
            note = 'Deposit to Crate TV Bill Savings Pot';
        }
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
                note = `Crate TV Film Festival - Unlock Block: "${blockTitle || itemId}"`;
                break;
            case 'movie':
                note = `Crate TV - Purchase Film: "${movieTitle || itemId}"`;
                break;
            default:
                note = "Crate TV Purchase";
        }
    } else {
        throw new Error("Invalid payment type specified.");
    }

    const squareUrl = isProduction 
      ? 'https://connect.squareup.com/v2/payments' 
      : 'https://connect.squareupsandbox.com/v2/payments';

    const response = await fetch(squareUrl, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-05-15',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: idempotencyKey,
        location_id: locationId,
        amount_money: {
          amount: amountInCents,
          currency: 'USD',
        },
        note: note,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || 'Payment failed.';
        throw new Error(errorMessage);
    }
    
    // Receipt notification
    if (email && process.env.RESEND_API_KEY) {
        try {
            const amountFormatted = (amountInCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            await resend.emails.send({
                from: `Crate TV <${fromEmail}>`,
                to: email,
                subject: `Payment Confirmation: ${paymentType === 'crateFestPass' ? 'Crate Fest Pass' : movieTitle || 'Crate TV'}`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6;">
                        <h1 style="color: #ef4444;">Thank You!</h1>
                        <p>Your payment of <strong>${amountFormatted}</strong> for your <strong>${paymentType === 'crateFestPass' ? 'Crate Fest Digital Pass' : 'Crate TV content'}</strong> has been processed successfully.</p>
                        <p>Access is now unlocked on your account.</p>
                        <p>Sincerely,<br/>The Crate TV Team</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error("[Payment API] Failed to send receipt:", emailError);
        }
    }

    return new Response(JSON.stringify({ success: true, payment: data.payment }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}