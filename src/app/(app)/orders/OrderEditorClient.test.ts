import { describe, expect, it } from "vitest";
import {
  computeFinalTotal,
  computeLineTotal,
  emptyLine,
  linesToLocal,
  parseLinesPayload,
  type LocalLine,
  type VariantOpt,
} from "./OrderEditorClient";

function line(overrides: Partial<LocalLine> = {}): LocalLine {
  return { ...emptyLine("k"), ...overrides };
}

describe("parseLinesPayload", () => {
  it("drops rows with no variant selected", () => {
    const out = parseLinesPayload([line({ variantId: "" }), line({ variantId: "v1", quantity: "2", unitPrice: "10" })]);
    expect(out).toHaveLength(1);
    expect(out?.[0].variantId).toBe("v1");
  });

  it("parses comma-decimal quantity/price input (pt-BR typed values)", () => {
    const out = parseLinesPayload([line({ variantId: "v1", quantity: "1,5", unitPrice: "29,90", productionPrice: "12,3" })]);
    expect(out?.[0]).toMatchObject({ quantity: 1.5, unitPrice: 29.9, productionPrice: 12.3 });
  });

  it("falls back to 0 for unparseable numeric fields instead of NaN", () => {
    const out = parseLinesPayload([line({ variantId: "v1", quantity: "abc", unitPrice: "", productionPrice: "x" })]);
    expect(out?.[0]).toMatchObject({ quantity: 0, unitPrice: 0, productionPrice: 0 });
  });

  it("sends an empty description as null, not an empty string", () => {
    const out = parseLinesPayload([line({ variantId: "v1", description: "   " })]);
    expect(out?.[0].description).toBeNull();
  });
});

describe("computeLineTotal", () => {
  it("sums quantity × unitPrice across lines", () => {
    const total = computeLineTotal([
      { variantId: "a", quantity: 2, unitPrice: 10, productionPrice: 0, description: null },
      { variantId: "b", quantity: 3, unitPrice: 5, productionPrice: 0, description: null },
    ]);
    expect(total).toBe(35);
  });

  it("returns 0 for no lines", () => {
    expect(computeLineTotal([])).toBe(0);
  });
});

describe("computeFinalTotal — coupon discount math", () => {
  it("subtracts the coupon discount from the subtotal", () => {
    expect(computeFinalTotal(100, 20)).toBe(80);
  });

  it("never goes negative even if the discount exceeds the subtotal", () => {
    expect(computeFinalTotal(10, 50)).toBe(0);
  });

  it("treats a missing/null discount as no discount", () => {
    expect(computeFinalTotal(100, null)).toBe(100);
    expect(computeFinalTotal(100, undefined)).toBe(100);
  });
});

describe("linesToLocal", () => {
  it("returns a single empty line when the order has no lines yet", () => {
    const out = linesToLocal([], () => "k1");
    expect(out).toHaveLength(1);
    expect(out[0].variantId).toBe("");
  });

  it("round-trips API lines into editable string fields", () => {
    const out = linesToLocal(
      [{ variantId: "v1", quantity: 2, unitPrice: 45.9, productionPrice: 10, description: "Nota" }],
      () => "k1",
    );
    expect(out[0]).toMatchObject({ variantId: "v1", quantity: "2", unitPrice: "45.9", description: "Nota" });
  });

  // Regression coverage for the production-cost auto-fill: a line whose variant SKU matches
  // a production batch should default productionPrice from that batch's cost per unit when
  // the order itself didn't already save one.
  it("fills productionPrice from the matching production batch cost when the line has none saved", () => {
    const variantById = new Map<string, VariantOpt>([["v1", { id: "v1", label: "Camisa P", sku: "CAM-P", price: 50 }]]);
    const skuToCost = new Map<string, number>([["CAM-P", 18.5]]);
    const out = linesToLocal(
      [{ variantId: "v1", quantity: 1, unitPrice: 50, productionPrice: null as unknown as number, description: null }],
      () => "k1",
      skuToCost,
      variantById,
    );
    expect(out[0].productionPrice).toBe("18.5");
  });

  it("keeps the order's own saved productionPrice instead of overriding it with the batch cost", () => {
    const variantById = new Map<string, VariantOpt>([["v1", { id: "v1", label: "Camisa P", sku: "CAM-P", price: 50 }]]);
    const skuToCost = new Map<string, number>([["CAM-P", 18.5]]);
    const out = linesToLocal(
      [{ variantId: "v1", quantity: 1, unitPrice: 50, productionPrice: 22, description: null }],
      () => "k1",
      skuToCost,
      variantById,
    );
    expect(out[0].productionPrice).toBe("22");
  });
});
