/**
 * Shopify Admin API adapter — server-side only.
 *
 * Fetches store meta, theme info, and recent orders.
 * Requires a private app token set in SHOPIFY_ADMIN_TOKEN.
 *
 * API version: 2025-01
 */

const API_VERSION = '2025-01';

export interface ShopifyTheme {
  id: number;
  name: string;
  role: 'main' | 'unpublished' | 'demo' | string;
  updatedAt: string;
}

export interface ShopifyStoreSummary {
  storeDomain: string;
  name: string;
  plan: string;
  currency: string;
  ordersLast30Days: number;
  revenueLast30Days: number;
  themes: ShopifyTheme[];
  activeTheme: ShopifyTheme | null;
  error?: string;
}

function shopifyFetch(storeDomain: string, token: string, path: string) {
  return fetch(`https://${storeDomain}/admin/api/${API_VERSION}/${path}`, {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });
}

export async function fetchShopifyStore(
  storeDomain: string,
  adminToken: string
): Promise<ShopifyStoreSummary> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const [shopRes, themesRes, ordersRes] = await Promise.all([
      shopifyFetch(storeDomain, adminToken, 'shop.json'),
      shopifyFetch(storeDomain, adminToken, 'themes.json'),
      shopifyFetch(
        storeDomain,
        adminToken,
        `orders.json?status=any&created_at_min=${thirtyDaysAgo}&fields=id,total_price&limit=250`
      ),
    ]);

    const [shopJson, themesJson, ordersJson] = await Promise.all([
      shopRes.json(),
      themesRes.json(),
      ordersRes.json(),
    ]);

    const themes: ShopifyTheme[] = (themesJson.themes ?? []).map(
      (t: { id: number; name: string; role: string; updated_at: string }) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        updatedAt: t.updated_at,
      })
    );

    const orders: Array<{ total_price: string }> = ordersJson.orders ?? [];
    const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);

    const shop = shopJson.shop ?? {};

    return {
      storeDomain,
      name: shop.name ?? storeDomain,
      plan: shop.plan_display_name ?? '',
      currency: shop.currency ?? 'USD',
      ordersLast30Days: orders.length,
      revenueLast30Days: revenue,
      themes,
      activeTheme: themes.find((t) => t.role === 'main') ?? null,
    };
  } catch (err) {
    return {
      storeDomain,
      name: storeDomain,
      plan: '',
      currency: 'USD',
      ordersLast30Days: 0,
      revenueLast30Days: 0,
      themes: [],
      activeTheme: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
