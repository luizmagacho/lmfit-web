/**
 * Loop 15 — funções puras de disparo de evento pros 3 pixels (Meta/GA4/TikTok). Cada uma só
 * chama o global daquele provedor se ele existir no `window` — o que só acontece depois que
 * `AnalyticsScripts` injeta o script real, que por sua vez só acontece com consentimento aceito e
 * o tenant tendo configurado aquele pixel. Sem isso tudo, cada chamada aqui é um no-op seguro.
 */

export interface AnalyticsPixelConfig {
  metaPixelId?: string;
  ga4MeasurementId?: string;
  tiktokPixelId?: string;
}

export function hasAnyPixelConfigured(cfg?: AnalyticsPixelConfig | null): boolean {
  return !!(cfg?.metaPixelId || cfg?.ga4MeasurementId || cfg?.tiktokPixelId);
}

export interface CartEventItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PurchaseEventParams {
  orderId: string;
  amount: number;
}

function win(): any {
  return typeof window === "undefined" ? undefined : (window as any);
}

export function trackPageView(): void {
  const w = win();
  if (!w) return;
  w.fbq?.("track", "PageView");
  w.gtag?.("event", "page_view");
  w.ttq?.page?.();
}

export function trackAddToCart(item: CartEventItem): void {
  const w = win();
  if (!w) return;
  const value = item.price * item.quantity;

  w.fbq?.("track", "AddToCart", {
    content_ids: [item.id],
    content_name: item.name,
    value,
    currency: "BRL",
  });

  w.gtag?.("event", "add_to_cart", {
    currency: "BRL",
    value,
    items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity }],
  });

  w.ttq?.track?.("AddToCart", {
    contents: [{ content_id: item.id, content_name: item.name, quantity: item.quantity, price: item.price }],
    value,
    currency: "BRL",
  });
}

export function trackPurchase(params: PurchaseEventParams): void {
  const w = win();
  if (!w) return;

  w.fbq?.("track", "Purchase", { value: params.amount, currency: "BRL", order_id: params.orderId });
  w.gtag?.("event", "purchase", { transaction_id: params.orderId, value: params.amount, currency: "BRL" });
  w.ttq?.track?.("CompletePayment", { value: params.amount, currency: "BRL", content_id: params.orderId });
}
