import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./useCartStore";

function baseLine() {
  return {
    variantId: "v1",
    productId: "p1",
    productName: "Cropped LM",
    sku: "CRP-001",
    color: "Preto",
    size: "M",
    priceRetail: 100,
    priceWholesale: 80,
    minWholesaleQty: 6,
    imageUrl: null,
  };
}

describe("useCartStore", () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useCartStore.getState().setRole("guest");
  });

  it("keeps retail under threshold", () => {
    const s = useCartStore.getState();
    s.addOrIncrement(baseLine(), 2);
    const snap = useCartStore.getState().snapshot();
    expect(snap.lines[0].mode).toBe("varejo");
    expect(snap.subtotal).toBe(200);
  });

  it("flips to atacado when qty reaches threshold", () => {
    useCartStore.getState().addOrIncrement(baseLine(), 6);
    const snap = useCartStore.getState().snapshot();
    expect(snap.lines[0].mode).toBe("atacado");
    expect(snap.subtotal).toBe(480);
  });

  it("wholesaler role always gets atacado", () => {
    useCartStore.getState().setRole("wholesaler");
    useCartStore.getState().addOrIncrement(baseLine(), 1);
    const snap = useCartStore.getState().snapshot();
    expect(snap.lines[0].mode).toBe("atacado");
    expect(snap.lines[0].unitPrice).toBe(80);
  });

  it("setQuantity to 0 removes the line", () => {
    useCartStore.getState().addOrIncrement(baseLine(), 2);
    useCartStore.getState().setQuantity("v1", 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it("role change recalculates prices", () => {
    useCartStore.getState().addOrIncrement(baseLine(), 2);
    useCartStore.getState().setRole("staff");
    expect(useCartStore.getState().lines[0].mode).toBe("atacado");
  });
});
