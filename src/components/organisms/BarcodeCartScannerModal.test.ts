import { describe, expect, it } from "vitest";
import { resolveLine } from "./BarcodeCartScannerModal";
import type { PdvProduct } from "@/lib/pdv/searchProducts";

function product(overrides: Partial<PdvProduct> = {}): PdvProduct {
  return {
    _id: "p1",
    name: "Cropped LM",
    sku: "CRP",
    priceRetail: 100,
    variants: [
      { _id: "v1", sku: "CRP-P-PRETO", color: "Preto", size: "P", price: 90, quantityOnHand: 5 },
      { _id: "v2", sku: "CRP-M-PRETO", color: "Preto", size: "M", quantityOnHand: 3 },
    ],
    ...overrides,
  };
}

describe("resolveLine (barcode → cart line)", () => {
  it("uses the variant's own price when it has one", () => {
    const line = resolveLine(product(), "v1");
    expect(line).toMatchObject({
      variantId: "v1",
      sku: "CRP-P-PRETO",
      color: "Preto",
      size: "P",
      priceRetail: 90,
    });
  });

  it("falls back to the product's retail price when the variant has none", () => {
    const line = resolveLine(product(), "v2");
    expect(line).toMatchObject({ variantId: "v2", priceRetail: 100 });
  });

  it("returns null when the variant id isn't found on the product", () => {
    expect(resolveLine(product(), "does-not-exist")).toBeNull();
  });

  it('normalizes "Único" color/size (single-variant products) to undefined', () => {
    const p = product({
      variants: [{ _id: "v3", sku: "SOLO", color: "Único", size: "Único", price: 50 }],
    });
    const line = resolveLine(p, "v3");
    expect(line?.color).toBeUndefined();
    expect(line?.size).toBeUndefined();
  });
});
