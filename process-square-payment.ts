// This is a Vercel Serverless Function to process payments with Square.
import { randomUUID } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// HARDENED PRICING: Server-side source of truth for fixed-price items.
const priceMap: Record<string, number> = {
  subscription: 499,
  pass: 5000,
  block: 1000, // Crate Fest Block Unlock: $10.00
  movie: 500,  // Crate Fest Single Film Rental: $5.00
  crateFestPass: 1500, // Default Crate Fest Full Pass: $15.00
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

    // Determine amount and note based on payment type, using server-side pricing for fixed items.
    if (paymentType === 'donation' || paymentType === 'billSavingsDeposit') {
        amountInCents = Math.round(Number(amount) * 100);
        if (amountInCents < 100) { // Minimum $1.00
            throw new Error("Amount must be at least $1.00.");
        }
        if (paymentType === 'donation') {
            note = `Support for film: "${movieTitle}" by ${directorName}`;
        } else {
            note = 'Deposit to Crate TV Bill Savings Pot';
        }
    } else if (priceMap[paymentType]) {
        amountInCents = priceMap[paymentType]; // Use server-side truth, ignore client-sent amount for security.
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
            case 'crateFestPass':
                note = `Crate Fest All-Access Activation`;
                break;
            default:
                note = "Crate TV Purchase";
        }
    } else {
        throw new Error("Invalid payment type specified.");
    }

    const response = await fetch(isProduction ? 'https://connect.squareup.com/v2/payments' : 'https://connect.squareupsandbox.com/v2/payments', {
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
    
    // Receipt Notification
    if (email) {
        try {
            const amountFormatted = (amountInCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            await resend.emails.send({
                from: `Crate TV Secure <${fromEmail}>`,
                to: email,
                subject: `Secure Payment Confirmed: ${amountFormatted}`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h1 style="color: #ef4444; text-transform: uppercase;">Payment Successful</h1>
                        <p>Thank you for supporting independent cinema. Your transaction has been securely authorized.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p><strong>Item:</strong> ${note}</p>
                        <p><strong>Amount:</strong> ${amountFormatted}</p>
                        <p><strong>Status:</strong> Verified & Unlocked</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 11px; color: #999;">Access is now live on your account across all platforms, including Roku.</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error("Receipt fail:", emailError);
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