// This is a Vercel Serverless Function to process payments with Square.
import { randomUUID } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || 'noreply@cratetv.net';

// Server-side price map in cents for security.
// This prevents users from manipulating prices on the client-side.
const priceMap: Record<string, number> = {
  subscription: 499,
  pass: 5000,
  block: 1000, // Crate Fest Block Unlock: $10.00
  movie: 500,  // Crate Fest Single Film Rental: $5.00
};

export async function POST(request: Request) {
  try {
    const { sourceId, amount, movieTitle, directorName, paymentType, itemId, blockTitle, email } = await request.json();
    
    console.log('--- [API /process-square-payment] Diagnostic Start ---');
    console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
    const isProduction = process.env.VERCEL_ENV === 'production';
    console.log(`Mode Detected: ${isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    
    const accessToken = isProduction
      ? process.env.SQUARE_ACCESS_TOKEN
      : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    
    const locationId = isProduction
      ? process.env.SQUARE_LOCATION_ID
      : process.env.SQUARE_SANDBOX_LOCATION_ID;

    console.log('Using Location ID:', locationId ? `...${locationId.slice(-4)}` : 'NOT FOUND');
    console.log('Using Access Token:', accessToken ? 'Exists' : 'NOT FOUND');
    console.log('--- [API /process-square-payment] Diagnostic End ---');

    if (!accessToken || !locationId) {
      const missingVar = isProduction ? 'Production' : 'Sandbox';
      throw new Error(`Square ${missingVar} Access Token or Location ID is not configured on the server.`);
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
    if (paymentType === 'donation' || paymentType === 'billSavingsDeposit' || paymentType === 'crateFestPass') {
        amountInCents = Math.round(Number(amount) * 100);
        if (amountInCents < 100) { // Minimum $1.00
            throw new Error("Amount must be at least $1.00.");
        }
        if (paymentType === 'donation') {
            note = `Support for film: "${movieTitle}" by ${directorName}`;
        } else if (paymentType === 'crateFestPass') {
            note = `Crate Fest All-Access Pass Activation`;
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

    const body = JSON.stringify({
      source_id: sourceId,
      idempotency_key: idempotencyKey,
      location_id: locationId,
      amount_money: {
        amount: amountInCents,
        currency: 'USD',
      },
      note: note,
    });

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
      body: body,
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data.errors?.[0]?.detail || 'Payment failed.';
        throw new Error(errorMessage);
    }
    
    // Receipt and Notification System
    if (response.ok && email) {
        try {
            const amountFormatted = (amountInCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            const emailHtml = `
                <div style="font-family: sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h1 style="color: #ef4444; text-transform: uppercase; letter-spacing: 2px;">Payment Successful</h1>
                    <p>Thank you for your contribution to independent cinema.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p><strong>Item:</strong> ${note}</p>
                    <p><strong>Amount:</strong> ${amountFormatted}</p>
                    <p><strong>Status:</strong> Securely Authorized</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #999;">Access is now unlocked on your Crate TV account across all devices, including Roku. You can close any open payment modals.</p>
                </div>
            `;
            
            await resend.emails.send({
                from: `Crate TV Secure <${fromEmail}>`,
                to: email,
                subject: `Secure Payment Confirmed: ${amountFormatted}`,
                html: emailHtml,
            });
        } catch (emailError) {
            console.error("[Payment API] Receipt failure:", emailError);
        }
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