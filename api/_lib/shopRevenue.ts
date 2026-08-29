import { Firestore } from 'firebase-admin/firestore';
import { fetchAllOrdersSince } from './fourthwallOpenApi.js';
import { normalize } from './creditMatch.js';

export interface ShopAttribution {
    productSlug: string;
    productName: string;
    filmmakerName: string;
    sharePercent: number; // 0–1, admin-set per product — merch margins vary
    // by product, unlike the fixed 70% split used for ticket/tip revenue.
}

export async function getShopAttributions(db: Firestore): Promise<ShopAttribution[]> {
    const snap = await db.collection('shop_attributions').get();
    return snap.docs.map(d => ({ productSlug: d.id, ...(d.data() as Omit<ShopAttribution, 'productSlug'>) }));
}

export interface ShopRevenueEntry {
    directorName: string; // first-seen display casing from the attribution
    cents: number;
}

/**
 * Sums each attributed filmmaker's share of shop sales since a given date,
 * in cents (to match the Square-based balance system, since Fourthwall's
 * order amounts are decimal dollars, not integer cents).
 * Returns a map keyed by normalized filmmaker name.
 */
export async function computeShopRevenueByFilmmaker(db: Firestore, sinceIso: string): Promise<Map<string, ShopRevenueEntry>> {
    const [orders, attributions] = await Promise.all([
        fetchAllOrdersSince(sinceIso),
        getShopAttributions(db),
    ]);

    const attributionBySlug = new Map(attributions.map(a => [a.productSlug, a]));
    const revenueByName = new Map<string, ShopRevenueEntry>();

    for (const order of orders) {
        if (order.status === 'CANCELLED') continue;
        for (const offer of order.offers || []) {
            const attribution = attributionBySlug.get(offer.slug);
            if (!attribution) continue;
            const priceValue = offer.variant?.price?.value;
            if (typeof priceValue !== 'number') continue;
            const shareCents = Math.round(priceValue * 100 * attribution.sharePercent);
            const key = normalize(attribution.filmmakerName);
            if (!key) continue;
            const existing = revenueByName.get(key);
            if (existing) existing.cents += shareCents;
            else revenueByName.set(key, { directorName: attribution.filmmakerName, cents: shareCents });
        }
    }

    return revenueByName;
}
