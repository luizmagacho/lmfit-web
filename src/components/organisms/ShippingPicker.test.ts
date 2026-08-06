import { describe, expect, it } from "vitest";
import { shippingCost } from "./ShippingPicker";

describe("shippingCost (Loop 13)", () => {
  it("pickup is always free regardless of config", () => {
    expect(shippingCost("pickup", { standardFee: 30, expressFee: 60 }, 0)).toBe(0);
  });

  it("falls back to the same defaults as the backend when the tenant has no config", () => {
    expect(shippingCost("standard", undefined, 0)).toBe(19.9);
    expect(shippingCost("express", undefined, 0)).toBe(39.9);
  });

  it("uses the tenant's configured fees instead of the hardcoded defaults", () => {
    expect(shippingCost("standard", { standardFee: 25, expressFee: 55 }, 0)).toBe(25);
    expect(shippingCost("express", { standardFee: 25, expressFee: 55 }, 0)).toBe(55);
  });

  it("waives standard/express fees once the subtotal meets the free-shipping threshold", () => {
    const cfg = { standardFee: 25, expressFee: 55, freeAboveTotal: 200 };
    expect(shippingCost("standard", cfg, 199)).toBe(25);
    expect(shippingCost("standard", cfg, 200)).toBe(0);
    expect(shippingCost("express", cfg, 250)).toBe(0);
  });

  it("ignores a zero/unset threshold (never waives the fee)", () => {
    expect(shippingCost("standard", { standardFee: 25, freeAboveTotal: 0 }, 1000)).toBe(25);
  });
});
