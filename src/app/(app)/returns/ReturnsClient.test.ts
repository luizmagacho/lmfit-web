import { describe, expect, it } from "vitest";
import { clampReturnQty, returnableLines } from "./ReturnsClient";
import type { OrderWithWarnings } from "@/lib/orders/types";

function order(lines: Array<Record<string, unknown>>): OrderWithWarnings {
  return { _id: "o1", lines } as unknown as OrderWithWarnings;
}

describe("returnableLines", () => {
  it("excludes backorder (isOrder) lines — stock was never deducted for them", () => {
    const lines = returnableLines(
      order([
        { variantId: "v1", quantity: 2, unitPrice: 50, isOrder: true },
        { variantId: "v2", quantity: 1, unitPrice: 30 },
      ]),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].variantId).toBe("v2");
  });

  it("excludes a line that's already been fully returned", () => {
    const lines = returnableLines(order([{ variantId: "v1", quantity: 2, unitPrice: 50, returnedQty: 2 }]));
    expect(lines).toHaveLength(0);
  });

  it("keeps a partially-returned line, reporting only the still-returnable quantity via quantity/returnedQty", () => {
    const lines = returnableLines(order([{ variantId: "v1", quantity: 5, unitPrice: 50, returnedQty: 2 }]));
    expect(lines).toEqual([{ variantId: "v1", description: undefined, quantity: 5, unitPrice: 50, returnedQty: 2 }]);
  });

  it("treats a missing returnedQty as 0, not NaN", () => {
    const lines = returnableLines(order([{ variantId: "v1", quantity: 3, unitPrice: 10 }]));
    expect(lines[0].returnedQty).toBe(0);
  });

  it("returns an empty list for an order with no lines", () => {
    expect(returnableLines(order([]))).toEqual([]);
  });
});

describe("clampReturnQty", () => {
  it("clamps to the available max", () => {
    expect(clampReturnQty(10, 3)).toBe(3);
  });

  it("clamps negative input to 0", () => {
    expect(clampReturnQty(-5, 3)).toBe(0);
  });

  it("passes through a value within range", () => {
    expect(clampReturnQty(2, 3)).toBe(2);
  });
});
