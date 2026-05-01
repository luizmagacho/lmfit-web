import { describe, expect, it } from "vitest";
import { collectVariantOptionsFromProducts, extractListItems, extractListTotal } from "./normalizeApiList";

describe("extractListItems", () => {
  it("accepts array", () => {
    expect(extractListItems([{ a: 1 }])).toEqual([{ a: 1 }]);
  });
  it("reads items", () => {
    expect(extractListItems({ items: [1, 2], total: 2 })).toEqual([1, 2]);
  });
  it("reads data", () => {
    expect(extractListItems({ data: ["x"] })).toEqual(["x"]);
  });
});

describe("extractListTotal", () => {
  it("uses total when present", () => {
    expect(extractListTotal({ items: [], total: 42 }, 0)).toBe(42);
  });
  it("falls back", () => {
    expect(extractListTotal({}, 5)).toBe(5);
  });
});

describe("collectVariantOptionsFromProducts", () => {
  it("uses nested variants", () => {
    const opts = collectVariantOptionsFromProducts([
      { name: "P", variants: [{ _id: "v1", sku: "S1", price: 10 }] },
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("v1");
  });
  it("uses flat product as one line", () => {
    const opts = collectVariantOptionsFromProducts([
      { _id: "p1", name: "P", sku: "FLAT", price: 20, quantityInStock: 1 },
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("p1");
    expect(opts[0].sku).toBe("FLAT");
  });
});
