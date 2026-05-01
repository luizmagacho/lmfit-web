import { describe, expect, it } from "vitest";
import { computeCartTotals, inferModeForUser, resolveUnitPrice } from "./pricing";

describe("pricing.resolveUnitPrice", () => {
  it("retail for low qty guest", () => {
    const r = resolveUnitPrice({ priceRetail: 100, priceWholesale: 80, minWholesaleQty: 6 }, 2, "guest");
    expect(r.mode).toBe("varejo");
    expect(r.price).toBe(100);
  });

  it("wholesale when qty reaches threshold", () => {
    const r = resolveUnitPrice({ priceRetail: 100, priceWholesale: 80, minWholesaleQty: 6 }, 6, "guest");
    expect(r.mode).toBe("atacado");
    expect(r.price).toBe(80);
  });

  it("wholesaler role always gets wholesale", () => {
    const r = resolveUnitPrice({ priceRetail: 100, priceWholesale: 80 }, 1, "wholesaler");
    expect(r.mode).toBe("atacado");
    expect(r.price).toBe(80);
  });

  it("falls back to flat price when wholesale missing", () => {
    const r = resolveUnitPrice({ price: 50 }, 10, "guest");
    expect(r.price).toBe(50);
  });
});

describe("computeCartTotals", () => {
  it("sums items and subtotal", () => {
    const t = computeCartTotals([
      { unitPrice: 10, quantity: 2 },
      { unitPrice: 5, quantity: 3 },
    ]);
    expect(t.items).toBe(5);
    expect(t.subtotal).toBe(35);
  });
});

describe("inferModeForUser", () => {
  it("staff and wholesaler -> atacado", () => {
    expect(inferModeForUser("staff")).toBe("atacado");
    expect(inferModeForUser("wholesaler")).toBe("atacado");
    expect(inferModeForUser("retail")).toBe("varejo");
    expect(inferModeForUser("guest")).toBe("varejo");
  });
});
