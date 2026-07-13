import { describe, expect, it } from "vitest";
import { computeReadyMadePrice, deriveInitialState } from "./ReadyMadeItemFields";

describe("computeReadyMadePrice", () => {
  it("applies the markup percent on top of cost", () => {
    expect(computeReadyMadePrice(30, 50)).toBe(45);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeReadyMadePrice(19.99, 33)).toBe(26.59);
  });

  it("is the cost itself at 0% markup", () => {
    expect(computeReadyMadePrice(30, 0)).toBe(30);
  });
});

describe("deriveInitialState", () => {
  it("defaults to manufactured/empty when creating a product (no row yet)", () => {
    const state = deriveInitialState(null);
    expect(state).toEqual({
      isReadyMade: false,
      supplierOpt: null,
      costPriceInput: "",
      markupPercentInput: "",
    });
  });

  it("hydrates from a saved ready-made product", () => {
    const state = deriveInitialState({
      sourceType: "ready_made",
      supplierId: "sup1",
      supplierName: "Fornecedor X",
      costPrice: 30,
      markupPercent: 50,
    });
    expect(state.isReadyMade).toBe(true);
    expect(state.supplierOpt).toEqual({ value: "sup1", label: "Fornecedor X" });
    expect(state.costPriceInput).toBe("30.00");
    expect(state.markupPercentInput).toBe("50");
  });

  it("falls back to the raw supplier id as the label when supplierName wasn't populated", () => {
    const state = deriveInitialState({ sourceType: "ready_made", supplierId: "sup1", costPrice: 10, markupPercent: 10 });
    expect(state.supplierOpt).toEqual({ value: "sup1", label: "sup1" });
  });

  it("treats a manufactured product as not ready-made even if stray cost fields exist", () => {
    const state = deriveInitialState({ sourceType: "manufactured", costPrice: 10, markupPercent: 10 });
    expect(state.isReadyMade).toBe(false);
  });
});
