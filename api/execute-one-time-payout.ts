import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';

interface SquarePayment {
  amount_money: { amount: number };
  note?: string;
}

const PARTNER_SHARE = 0.70;
const SYSTEM_RESET_DATE = '2025-05-24T00:00:00Z';

async function fetchDirectorTotal(accessToken: string, locationId: string, directorName: string): Promise<number> {
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

    // Calculate gross for this director
    // This is a simplified calculation logic mirroring get-filmmaker-analytics.ts
    const target = directorName.trim().toLowerCase();
    let grossInCents = 0;

    allPayments.forEach(p => {
        const note = (p.note || '').toLowerCase();
        if (note.includes(target)) {
            grossInCents += p.amount_money.amount;
        }
    });

    return Math.round(grossInCents * PARTNER_SHARE);
}

export async function POST(request: Request) {
    try {
        const { password, directorName } = await request.json();

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
        
        if (keySnap.empty) throw new Error("Invalid or Expired Authorization.");
        const keyDoc = keySnap.docs[0];
        const keyData = keyDoc.data();

        if (keyData.directorName !== directorName) throw new Error("Identity Mismatch.");

        // 2. Fetch Payout Destination (Simplified for MVP, assuming global recipient for now or specific linking)
        const configDoc = await db.collection('festival').doc('config').get();
        const config = configDoc.data();
        const recipientId = config?.payoutRecipientId; 

        if (!recipientId) throw new Error("Payout destination not linked to terminal.");

        const isProduction = process.env.VERCEL_ENV === 'production';
        const accessToken = isProduction ? process.env.SQUARE_ACCESS_TOKEN : process.env.SQUARE_SANDBOX_ACCESS_TOKEN;
        const locationId = isProduction ? process.env.SQUARE_LOCATION_ID : process.env.SQUARE_SANDBOX_LOCATION_ID;

        if (!accessToken || !locationId) throw new Error("Server config fail.");

        // 3. Final Calculations
        const partnerTotalEntitlement = await fetchDirectorTotal(accessToken, locationId, directorName);
        const historySnap = await db.collection('payout_history').where('recipient', '==', directorName).get();
        const totalPaid = historySnap.docs.reduce((s, doc) => s + (doc.data().amount || 0), 0);
        
        const eligibleAmount = partnerTotalEntitlement - totalPaid;

        if (eligibleAmount < 100) throw new Error("Insufficient terminal balance.");

        // 4. Square Dispatch
        const idempotencyKey = randomUUID();
        const squareUrl = isProduction ? 'https://connect.squareup.com/v2/payouts' : 'https://connect.squareupsandbox.com/v2/payouts';

        const payoutResponse = await fetch(squareUrl, {
            method: 'POST',
            headers: { 'Square-Version': '2024-05-15', 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idempotency_key: idempotencyKey,
                location_id: locationId,
                recipient: { id: recipientId, type: 'CUSTOMER' }, // Assuming the director links a customer node
                amount_money: { amount: eligibleAmount, currency: 'USD' },
            }),
        });

        const payoutData = await payoutResponse.json();
        if (!payoutResponse.ok) throw new Error(payoutData.errors?.[0]?.detail || 'Square Payout Failure.');

        // 5. Audit, Log, and PURGE AUTH
        const batch = db.batch();
        
        // FIX: Firestore WriteBatch does not have an .add() method. 
        // We use .doc() to generate a reference and .set() to add the data.
        const historyRef = db.collection('payout_history').doc();
        batch.set(historyRef, {
            recipient: directorName,
            amount: eligibleAmount,
            status: 'SUCCESS',
            processedAt: FieldValue.serverTimestamp(),
            method: 'ONE_TIME_HANDSHAKE'
        });

        const logRef = db.collection('audit_logs').doc();
        batch.set(logRef, {
            role: 'director_payout',
            action: 'ONE_TIME_PAYOUT_SUCCESS',
            type: 'MUTATION',
            details: `Authorized final payout for ${directorName}: $${(eligibleAmount/100).toFixed(2)}. Authorization key invalidated.`,
            timestamp: FieldValue.serverTimestamp()
        });

        // IRREVERSIBLE ACTION: Delete the access key
        batch.delete(keyDoc.ref);

        await batch.commit();

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}