import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { PromoCode } from '../types.js';

export async function POST(request: Request) {
    try {
        const { code, itemId, originalPriceInCents } = await request.json();

        if (!code) {
            return new Response(JSON.stringify({ error: "Code is required." }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error("Database offline.");

        // Case-insensitive lookup
        const promoSnap = await db.collection('promo_codes').where('code', '==', code.toUpperCase().trim()).limit(1).get();
        
        if (promoSnap.empty) {
            return new Response(JSON.stringify({ error: "Invalid voucher code." }), { status: 404 });
        }

        const promoDoc = promoSnap.docs[0];
        const promo = { id: promoDoc.id, ...promoDoc.data() } as PromoCode;

        // Validation Logic
        if (promo.usedCount >= promo.maxUses) {
            return new Response(JSON.stringify({ error: "This code has reached its maximum usage limit." }), { status: 403 });
        }

        if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
             return new Response(JSON.stringify({ error: "This code has expired." }), { status: 403 });
        }

        if (promo.itemId && promo.itemId !== itemId) {
             return new Response(JSON.stringify({ error: "This code is not valid for this specific content." }), { status: 403 });
        }

        // Calculate Result
        let finalPriceInCents = originalPriceInCents;
        let isFree = false;

        if (promo.type === 'one_time_access') {
            finalPriceInCents = 0;
            isFree = true;
        } else if (promo.type === 'discount') {
            const discountFactor = (100 - promo.discountValue) / 100;
            finalPriceInCents = Math.round(originalPriceInCents * discountFactor);
            if (finalPriceInCents === 0) isFree = true;
        }

        return new Response(JSON.stringify({ 
            success: true, 
            finalPriceInCents, 
            isFree,
            discountType: promo.type,
            discountValue: promo.discountValue
        }), { status: 200 });

    } catch (error) {
        console.error("Promo validation error:", error);
        return new Response(JSON.stringify({ error: "Security check failed." }), { status: 500 });
    }
}