import { describe, expect, it } from "vitest";
import { buildOrderLinesPayload, deriveOrderStatus, matchBarcodeVariantLabel } from "./PdvClient";
import type { CartLine } from "@/stores/useCartStore";
import type { PdvProduct } from "@/lib/pdv/searchProducts";

function cartLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    variantId: "v1",
    productId: "p1",
    productName: "Camisa Dry Fit",
    sku: "CAM-P",
    quantity: 1,
    priceRetail: 50,
    priceWholesale: null,
    minWholesaleQty: 6,
    unitPrice: 50,
    mode: "varejo",
    ...overrides,
  };
}

describe("buildOrderLinesPayload", () => {
  it("builds the description from product name, color and size", () => {
    const [payload] = buildOrderLinesPayload([cartLine({ color: "Preto", size: "M" })]);
    expect(payload.description).toBe("Camisa Dry Fit · Preto · M");
  });

  it("skips missing color/size instead of leaving stray separators", () => {
    const [payload] = buildOrderLinesPayload([cartLine({ color: undefined, size: undefined })]);
    expect(payload.description).toBe("Camisa Dry Fit");
  });

  it("carries variantId/quantity/unitPrice/isOrder through unchanged", () => {
    const [payload] = buildOrderLinesPayload([cartLine({ variantId: "v9", quantity: 3, unitPrice: 22.5, isOrder: true })]);
    expect(payload).toMatchObject({ variantId: "v9", quantity: 3, unitPrice: 22.5, isOrder: true });
  });
});

describe("deriveOrderStatus", () => {
  it("is completed when every line has stock (no backorder)", () => {
    expect(deriveOrderStatus([cartLine(), cartLine({ variantId: "v2" })])).toBe("completed");
  });

  // Regression-relevant: a sale that mixes an in-stock item with a backorder item must
  // stay "open" for the WHOLE order — completing it early would credit stock that was
  // never actually deducted for the backorder line.
  it("stays open if ANY line is a backorder, even if most lines have stock", () => {
    expect(deriveOrderStatus([cartLine(), cartLine({ variantId: "v2", isOrder: true })])).toBe("open");
  });

  it("is completed for an empty cart (no lines to block on)", () => {
    expect(deriveOrderStatus([])).toBe("completed");
  });
});

describe("matchBarcodeVariantLabel", () => {
  const product: PdvProduct = {
    name: "Camisa Dry Fit",
    variants: [
      { _id: "v1", color: "Preto", size: "M" },
      { _id: "v2", color: "Azul" },
    ],
  };

  it("joins color and size for the matched variant", () => {
    expect(matchBarcodeVariantLabel(product, "v1")).toBe("Preto · M");
  });

  it("omits the separator when only color is set", () => {
    expect(matchBarcodeVariantLabel(product, "v2")).toBe("Azul");
  });

  it("returns null when no variant matches the scanned id", () => {
    expect(matchBarcodeVariantLabel(product, "does-not-exist")).toBeNull();
  });

  it("returns null when variantId is undefined (product-level barcode match)", () => {
    expect(matchBarcodeVariantLabel(product, undefined)).toBeNull();
  });
});
