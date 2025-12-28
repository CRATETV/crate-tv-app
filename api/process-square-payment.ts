
import { randomUUID } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@cratetv.net';

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
    const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
    const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

    if (!accessToken || !locationId) throw new Error("Square misconfigured.");

    const idempotencyKey = randomUUID();
    let amountInCents: number;
    let note: string;

    if (['donation', 'billSavingsDeposit', 'watchPartyTicket'].includes(paymentType)) {
        amountInCents = Math.round(Number(amount) * 100);
        note = paymentType === 'donation' ? `Support: "${movieTitle}"` : `Crate TV Payment`;
    } else if (priceMap[paymentType]) {
        amountInCents = priceMap[paymentType];
        note = paymentType === 'movie' ? `24h Rental: ${movieTitle}` : `Purchase: ${paymentType}`;
    } else throw new Error("Invalid type");

    const squareUrl = isProduction ? 'https://connect.squareup.com/v2/payments' : 'https://connect.squareupsandbox.com/v2/payments';
    const response = await fetch(squareUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, idempotency_key: idempotencyKey, location_id: locationId, amount_money: { amount: amountInCents, currency: 'USD' }, note }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.detail || 'Payment failed.');
    
    // --- Send Receipt via Resend ---
    if (email && process.env.RESEND_API_KEY) {
        try {
            await resend.emails.send({
                from: `Crate TV Receipts <${FROM_EMAIL}>`,
                to: [email],
                subject: `Confirmation: ${movieTitle || 'Payment'}`,
                html: `<p>Thank you for your payment of $${(amountInCents / 100).toFixed(2)}!</p>`,
            });
        } catch (e) {
            console.warn("[Resend] Failed to send receipt. Check Resend domain verification.", e);
        }
    }

    return new Response(JSON.stringify({ success: true, payment: data.payment }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
