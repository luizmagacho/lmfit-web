import { describe, expect, it } from "vitest";
import { applyBulkChange } from "./useInventoryBulkStore";

describe("applyBulkChange", () => {
  it("applies price percent", () => {
    expect(applyBulkChange({ price: 100 }, { pricePercent: 10 }).price).toBe(110);
    expect(applyBulkChange({ price: 100 }, { pricePercent: -5 }).price).toBe(95);
  });

  it("priceSet wins over pricePercent", () => {
    expect(
      applyBulkChange({ price: 100 }, { pricePercent: 10, priceSet: 50 }).price,
    ).toBe(50);
  });

  it("clamps negative values", () => {
    expect(applyBulkChange({ price: 100 }, { pricePercent: -9999 }).price).toBe(0);
    expect(applyBulkChange({ quantityInStock: 2 }, { quantityInStockDelta: -9 }).quantityInStock).toBe(0);
  });

  it("quantityInStockSet wins over delta", () => {
    expect(
      applyBulkChange(
        { quantityInStock: 3 },
        { quantityInStockDelta: 5, quantityInStockSet: 10 },
      ).quantityInStock,
    ).toBe(10);
  });
});
