import { describe, expect, it } from "vitest";
import { freeShippingProgress, pickCrossSellCategory, filterCrossSellCandidates } from "./CartDrawer";
import type { CartLine } from "@/stores/useCartStore";

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    variantId: "v1",
    productId: "p1",
    productName: "Camiseta",
    sku: "SKU-1",
    quantity: 1,
    priceRetail: 100,
    priceWholesale: null,
    minWholesaleQty: 1,
    unitPrice: 100,
    mode: "varejo",
    ...overrides,
  };
}

describe("freeShippingProgress", () => {
  it("computes remaining amount and progress percentage below the threshold", () => {
    expect(freeShippingProgress(150, 500)).toEqual({ remaining: 350, pct: 30 });
  });

  it("is 0 remaining / 100% once the subtotal meets the threshold exactly", () => {
    expect(freeShippingProgress(500, 500)).toEqual({ remaining: 0, pct: 100 });
  });

  it("is 0 remaining / 100% (capped) once the subtotal exceeds the threshold", () => {
    expect(freeShippingProgress(800, 500)).toEqual({ remaining: 0, pct: 100 });
  });

  it("treats a zero/unset threshold as already free (100%, no bar to show)", () => {
    expect(freeShippingProgress(50, 0)).toEqual({ remaining: 0, pct: 100 });
  });

  it("never returns a negative percentage for a zero subtotal", () => {
    expect(freeShippingProgress(0, 500)).toEqual({ remaining: 500, pct: 0 });
  });
});

describe("pickCrossSellCategory (Loop 9)", () => {
  it("returns the category of the last line added", () => {
    const lines = [line({ variantId: "v1", category: "vestidos" }), line({ variantId: "v2", category: "calcas" })];
    expect(pickCrossSellCategory(lines)).toBe("calcas");
  });

  it("walks backwards to find a category when the last line has none", () => {
    const lines = [line({ variantId: "v1", category: "vestidos" }), line({ variantId: "v2", category: undefined })];
    expect(pickCrossSellCategory(lines)).toBe("vestidos");
  });

  it("returns undefined for an empty cart or a cart with no categorized lines", () => {
    expect(pickCrossSellCategory([])).toBeUndefined();
    expect(pickCrossSellCategory([line({ category: undefined })])).toBeUndefined();
  });
});

describe("filterCrossSellCandidates (Loop 9)", () => {
  it("excludes products already in the cart", () => {
    const items = [{ _id: "p1", name: "A" }, { _id: "p2", name: "B" }, { _id: "p3", name: "C" }];
    const out = filterCrossSellCandidates(items, new Set(["p1"]));
    expect(out.map((p) => p._id)).toEqual(["p2", "p3"]);
  });

  it("caps the result at the given limit", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ _id: `p${i}`, name: `Item ${i}` }));
    const out = filterCrossSellCandidates(items, new Set(), 4);
    expect(out).toHaveLength(4);
  });

  it("defaults to a limit of 4 when none is given", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ _id: `p${i}`, name: `Item ${i}` }));
    const out = filterCrossSellCandidates(items, new Set());
    expect(out).toHaveLength(4);
  });
});
