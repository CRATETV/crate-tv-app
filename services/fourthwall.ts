// Fourthwall Storefront API client
// Docs: https://docs.fourthwall.com/storefront/overview
//
// VITE_FOURTHWALL_STOREFRONT_TOKEN and VITE_FOURTHWALL_SHOP_SUBDOMAIN are
// public, client-facing values by Fourthwall's own design (same trust level
// as a Stripe publishable key) — they're meant to ship inside the browser
// bundle, unlike server-side secrets.

const STOREFRONT_TOKEN = import.meta.env.VITE_FOURTHWALL_STOREFRONT_TOKEN;
const SHOP_SUBDOMAIN = import.meta.env.VITE_FOURTHWALL_SHOP_SUBDOMAIN;
const BASE_URL = 'https://storefront-api.fourthwall.com/v1';

if (!STOREFRONT_TOKEN) {
  // Don't throw — just warn, so the rest of the app doesn't crash if the
  // shop page simply isn't visited yet.
  console.warn('[fourthwall] VITE_FOURTHWALL_STOREFRONT_TOKEN is not set.');
}

export interface FourthwallImage {
  url: string;
  width: number;
  height: number;
}

export interface FourthwallVariant {
  id: string;
  name: string;
  sku: string;
  unitPrice: { value: number; currency: string };
  attributes?: Record<string, string>;
}

export interface FourthwallProduct {
  id: string;
  slug: string;
  name: string;
  description?: string;
  images: FourthwallImage[];
  variants: FourthwallVariant[];
}

export interface FourthwallCollection {
  id: string;
  slug: string;
  name: string;
}

export interface FourthwallCart {
  id: string;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: { value: number; currency: string };
  }>;
  subtotal?: { value: number; currency: string };
  checkoutUrl?: string;
}

interface FourthwallPaging {
  pageNumber: number;
  pageSize: number;
  elementsSize: number;
  elementsTotal: number;
  totalPages: number;
  hasNextPage: boolean;
}

async function fwFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}storefront_token=${STOREFRONT_TOKEN}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Fourthwall API error ${res.status}: ${text}`);
  }
  return res.json();
}

/** Fetch all collections in the shop. */
export function getCollections() {
  return fwFetch<{ results: FourthwallCollection[] }>('/collections');
}

/**
 * Fetch every product in a given collection by its slug (e.g. "all").
 *
 * The storefront API paginates (`page`/`size`, default page size well under
 * most shops' full catalog) — fetching just the first page meant any product
 * past it silently never showed up, and which products that was shifted
 * every time a new one got added. Walk every page via `hasNextPage` so the
 * full catalog always shows, no matter how many products exist.
 *
 * Two confirmed-by-testing quirks that aren't obvious from the docs:
 * - `page` is 0-indexed (the first page is `page=0`, not `1`) — passing `1`
 *   skips the real first page's products entirely.
 * - Requesting a `size` of 20 or more makes this endpoint come back with an
 *   empty `results` array (200 OK, correct `elementsTotal`, but zero actual
 *   items) — some undocumented cap well under what the docs' `size` param
 *   implies. 10 is confirmed to work reliably.
 */
export async function getProductsByCollection(collectionSlug: string) {
  const results: FourthwallProduct[] = [];
  let page = 0;
  const size = 10;
  while (true) {
    const data = await fwFetch<{ results: FourthwallProduct[]; paging: FourthwallPaging }>(
      `/collections/${collectionSlug}/products?page=${page}&size=${size}`
    );
    results.push(...data.results);
    if (!data.paging?.hasNextPage) break;
    page += 1;
  }
  return { results };
}

/** Fetch a single product by its slug. */
export function getProductBySlug(slug: string) {
  return fwFetch<FourthwallProduct>(`/products/${slug}`);
}

/** Fetch an existing cart by id — used to resume a returning visitor's cart. */
export function getCart(cartId: string) {
  return fwFetch<FourthwallCart>(`/carts/${cartId}`);
}

/** Create a new empty cart, or one seeded with items. */
export function createCart(items: Array<{ variantId: string; quantity: number }> = []) {
  return fwFetch<FourthwallCart>('/carts', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

/** Add an item to an existing cart. */
export function addCartItem(cartId: string, variantId: string, quantity: number) {
  return fwFetch<FourthwallCart>(`/carts/${cartId}/add`, {
    method: 'POST',
    body: JSON.stringify({ items: [{ variantId, quantity }] }),
  });
}

/** Remove/update an item's quantity in an existing cart. */
export function updateCartItem(cartId: string, variantId: string, quantity: number) {
  return fwFetch<FourthwallCart>(`/carts/${cartId}/change`, {
    method: 'POST',
    body: JSON.stringify({ items: [{ variantId, quantity }] }),
  });
}

/** Build the URL to Fourthwall's hosted checkout for a given cart. */
export function getCheckoutUrl(cartId: string) {
  return `https://${SHOP_SUBDOMAIN}.fourthwall.com/checkout?cartCurrency=USD&cartId=${cartId}`;
}
