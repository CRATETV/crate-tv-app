import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

interface SquarePayment {
  amount_money: { amount: number };
  note?: string;
}

const PARTNER_SHARE = 0.70;
const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';

async function fetchYieldTotal(accessToken: string, locationId: string, targetName: string, type: string): Promise<number> {
    const squareUrlBase = process.env.VERCEL_ENV === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
    let allPayments: SquarePayment[] = [];
    let cursor: string | undefined = undefined;

    do {
        const url = new URL(`${squareUrlBase}/v2/payments`);
        url.searchParams.append('begin_time', SYSTEM_RESET_DATE);
        url.searchParams.append('location_id', locationId);
        if (cursor) url.searchParams.append('cursor', cursor);
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.payments) allPayments.push(...data.payments);
        cursor = data.cursor;
    } while (cursor);

    let grossInCents = 0;
    const target = targetName.trim().toLowerCase();

    allPayments.forEach(p => {
        const note = (p.note || '').toLowerCase();
        if (type === 'festival') {
            // Institutional partner gets 70% of EVERYTHING tagged as pass, block, or watch party
            if (note.includes('pass') || note.includes('block') || note.includes('watch party')) {
                grossInCents += p.amount_money.amount;
            }
        } else {
            // Filmmaker only gets 70% of revenue explicitly containing their name
            if (note.includes(target)) {
                grossInCents += p.amount_money.amount;
            }
        }
    });

    return Math.round(grossInCents * PARTNER_SHARE);
}

export async function POST(request: Request) {
    try {
        const { password, targetName, type } = await request.json();

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("DB offline");

        // 1. Verify and Fetch Key Data
        const keySnap = await db.collection('director_payout_keys')
            .where('accessKey', '==', password)
            .where('status', '==', 'ACTIVE')
            .limit(1)
            .get();
        
        if (keySnap.empty) throw new Error("Invalid or Expired Authorization Token.");
        const keyDoc = keySnap.docs[0];
        const keyData = keyDoc.data();

        if (keyData.directorName !== targetName) throw new Error("Security Identity Mismatch.");

        // 2. Fetch Payout Destination
        const configDoc = await db.collection('festival').doc('config').get();
        const config = configDoc.data();
        const recipientId = config?.payoutRecipientId; 

        if (!recipientId) throw new Error("No payout destination linked to this terminal cluster.");

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        if (!accessToken || !locationId) throw new Error("Server configuration missing.");

        // 3. Final Precise Calculations
        const partnerTotalEntitlement = await fetchYieldTotal(accessToken, locationId, targetName, type);
        const historySnap = await db.collection('payout_history').where('recipient', '==', targetName).get();
        const totalPaid = historySnap.docs.reduce((s, doc) => s + (doc.data().amount || 0), 0);
        
        const eligibleAmount = partnerTotalEntitlement - totalPaid;

        if (eligibleAmount < 100) throw new Error("Insufficient node balance for dispatch.");

        // 4. Square Dispatch Handshake
        const idempotencyKey = randomUUID();
        const squareUrl = isProduction ? 'https://connect.squareup.com/v2/payouts' : 'https://connect.squareupsandbox.com/v2/payouts';

        const payoutResponse = await fetch(squareUrl, {
            method: 'POST',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idempotency_key: idempotencyKey,
                location_id: locationId,
                recipient: { id: recipientId, type: 'CUSTOMER' },
                amount_money: { amount: eligibleAmount, currency: 'USD' },
            }),
        });

        const payoutData = await payoutResponse.json();
        if (!payoutResponse.ok) throw new Error(payoutData.errors?.[0]?.detail || 'Square Handshake Rejection.');

        // 5. Audit, Log, and PURGE AUTH PERMANENTLY
        const batch = db.batch();
        const historyRef = db.collection('payout_history').doc();
        batch.set(historyRef, {
            recipient: targetName,
            amount: eligibleAmount,
            status: 'SUCCESS',
            processedAt: FieldValue.serverTimestamp(),
            method: 'ONE_TIME_HANDSHAKE',
            type: type
        });

        const logRef = db.collection('audit_logs').doc();
        batch.set(logRef, {
            role: 'director_payout',
            action: `ONE_TIME_${type.toUpperCase()}_PAYOUT_SUCCESS`,
            type: 'MUTATION',
            details: `Authorized final yield for ${targetName}: $${(eligibleAmount/100).toFixed(2)}. Access key purged.`,
            timestamp: FieldValue.serverTimestamp()
        });

        // IRREVERSIBLE: Kill the voucher node
        batch.delete(keyDoc.ref);

        await batch.commit();

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}