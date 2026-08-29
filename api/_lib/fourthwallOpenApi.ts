// Fourthwall Open (Platform) API client — server-side only.
// Docs: https://docs.fourthwall.com/guides/overview , .../api-reference/platform/orders/list-orders
//
// This is a DIFFERENT credential pair from VITE_FOURTHWALL_STOREFRONT_TOKEN
// (which is public/client-safe by design). FOURTHWALL_OPEN_API_USERNAME/
// PASSWORD are real secrets — an "Open API User" created in the Fourthwall
// dashboard under For Developers — and must never be exposed to the client
// or logged.

const BASE_URL = 'https://api.fourthwall.com/open-api/v1.0';

function getAuthHeader(): string | null {
    const username = process.env.FOURTHWALL_OPEN_API_USERNAME;
    const password = process.env.FOURTHWALL_OPEN_API_PASSWORD;
    if (!username || !password) return null;
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

export interface FourthwallOrderVariant {
    id: string;
    name: string;
    sku: string;
    price: { value: number; currency: string };
    quantity: number;
    attributes?: Record<string, string>;
}

export interface FourthwallOrderOffer {
    id: string;
    name: string;
    slug: string;
    variant: FourthwallOrderVariant;
}

export interface FourthwallOrder {
    id: string;
    friendlyId: string;
    status: string;
    email: string;
    offers: FourthwallOrderOffer[];
    amounts: { subtotal: { value: number; currency: string }; total: { value: number; currency: string } };
    createdAt: string;
    updatedAt: string;
}

/**
 * Fetches every order since a given date, paging through the full result
 * set. Returns an empty array (rather than throwing) if credentials aren't
 * configured, so callers can degrade gracefully like the Square-based
 * balance computation does.
 */
export async function fetchAllOrdersSince(sinceIso: string): Promise<FourthwallOrder[]> {
    const authHeader = getAuthHeader();
    if (!authHeader) return [];

    const allOrders: FourthwallOrder[] = [];
    let page = 0;
    const size = 50;

    while (true) {
        const url = new URL(`${BASE_URL}/order`);
        url.searchParams.set('page', String(page));
        url.searchParams.set('size', String(size));
        url.searchParams.set('createdAt[gt]', sinceIso);

        const res = await fetch(url.toString(), {
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Fourthwall Open API error ${res.status}: ${text}`);
        }
        const data = await res.json();
        allOrders.push(...(data.results || []));

        if (!data.totalPages || page >= data.totalPages - 1) break;
        page++;
    }

    return allOrders;
}
