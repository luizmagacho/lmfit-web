import { afterEach, describe, expect, it, vi } from "vitest";
import { hasAnyPixelConfigured, trackAddToCart, trackPageView, trackPurchase } from "./analytics";

function stubWindowGlobals() {
  const fbq = vi.fn();
  const gtag = vi.fn();
  const ttqTrack = vi.fn();
  const ttqPage = vi.fn();
  (window as any).fbq = fbq;
  (window as any).gtag = gtag;
  (window as any).ttq = { track: ttqTrack, page: ttqPage };
  return { fbq, gtag, ttqTrack, ttqPage };
}

afterEach(() => {
  delete (window as any).fbq;
  delete (window as any).gtag;
  delete (window as any).ttq;
});

describe("hasAnyPixelConfigured", () => {
  it("is false when no pixel id is set", () => {
    expect(hasAnyPixelConfigured(undefined)).toBe(false);
    expect(hasAnyPixelConfigured({})).toBe(false);
  });

  it("is true when at least one pixel id is set", () => {
    expect(hasAnyPixelConfigured({ metaPixelId: "123" })).toBe(true);
    expect(hasAnyPixelConfigured({ ga4MeasurementId: "G-ABC" })).toBe(true);
    expect(hasAnyPixelConfigured({ tiktokPixelId: "456" })).toBe(true);
  });
});

describe("trackPageView", () => {
  it("calls fbq/gtag/ttq page-view equivalents when present", () => {
    const { fbq, gtag, ttqPage } = stubWindowGlobals();
    trackPageView();
    expect(fbq).toHaveBeenCalledWith("track", "PageView");
    expect(gtag).toHaveBeenCalledWith("event", "page_view");
    expect(ttqPage).toHaveBeenCalled();
  });

  it("is a safe no-op when no pixel script has loaded", () => {
    expect(() => trackPageView()).not.toThrow();
  });
});

describe("trackAddToCart", () => {
  it("computes value as price * quantity across all three providers", () => {
    const { fbq, gtag, ttqTrack } = stubWindowGlobals();
    trackAddToCart({ id: "v1", name: "Legging Preta", price: 39.9, quantity: 2 });

    expect(fbq).toHaveBeenCalledWith(
      "track",
      "AddToCart",
      expect.objectContaining({ value: 79.8, currency: "BRL", content_ids: ["v1"] }),
    );
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "add_to_cart",
      expect.objectContaining({ value: 79.8, currency: "BRL" }),
    );
    expect(ttqTrack).toHaveBeenCalledWith("AddToCart", expect.objectContaining({ value: 79.8, currency: "BRL" }));
  });

  it("is a safe no-op when no pixel script has loaded", () => {
    expect(() => trackAddToCart({ id: "v1", name: "X", price: 10, quantity: 1 })).not.toThrow();
  });
});

describe("trackPurchase", () => {
  it("sends the order id and amount to all three providers", () => {
    const { fbq, gtag, ttqTrack } = stubWindowGlobals();
    trackPurchase({ orderId: "order-42", amount: 199.9 });

    expect(fbq).toHaveBeenCalledWith("track", "Purchase", { value: 199.9, currency: "BRL", order_id: "order-42" });
    expect(gtag).toHaveBeenCalledWith("event", "purchase", { transaction_id: "order-42", value: 199.9, currency: "BRL" });
    expect(ttqTrack).toHaveBeenCalledWith("CompletePayment", { value: 199.9, currency: "BRL", content_id: "order-42" });
  });

  it("is a safe no-op when no pixel script has loaded", () => {
    expect(() => trackPurchase({ orderId: "order-1", amount: 50 })).not.toThrow();
  });
});
