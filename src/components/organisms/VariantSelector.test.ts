import { describe, expect, it } from "vitest";
import { deriveStockState } from "./VariantSelector";

describe("deriveStockState (Loop 5) — mirrors low-stock.cron.ts's reorderPoint semantics", () => {
  it("is 'disponivel' when stock is well above the reorder point", () => {
    expect(deriveStockState({ quantityOnHand: 10, reorderPoint: 2 })).toBe("disponivel");
  });

  it("is 'ultimas-unidades' when stock is at or below a configured reorder point", () => {
    expect(deriveStockState({ quantityOnHand: 2, reorderPoint: 2 })).toBe("ultimas-unidades");
    expect(deriveStockState({ quantityOnHand: 1, reorderPoint: 3 })).toBe("ultimas-unidades");
  });

  it("is 'disponivel', not 'ultimas-unidades', when reorderPoint is 0/unset (feature opt-out)", () => {
    expect(deriveStockState({ quantityOnHand: 1, reorderPoint: 0 })).toBe("disponivel");
    expect(deriveStockState({ quantityOnHand: 1 })).toBe("disponivel");
  });

  it("is 'esgotado' when stock is zero and backorder is not accepted", () => {
    expect(deriveStockState({ quantityOnHand: 0, acceptsBackorder: false })).toBe("esgotado");
    expect(deriveStockState({ quantityOnHand: 0 })).toBe("esgotado");
  });

  it("is 'sob-encomenda' when stock is zero but the variant accepts backorder", () => {
    expect(deriveStockState({ quantityOnHand: 0, acceptsBackorder: true })).toBe("sob-encomenda");
  });

  it("treats negative stock the same as zero", () => {
    expect(deriveStockState({ quantityOnHand: -3, acceptsBackorder: true })).toBe("sob-encomenda");
    expect(deriveStockState({ quantityOnHand: -3 })).toBe("esgotado");
  });
});
