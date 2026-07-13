import { describe, expect, it } from "vitest";
import { flattenVariants, transferErrorMessage } from "./LocationsClient";

describe("flattenVariants", () => {
  it("builds a label with color/size and SKU", () => {
    const out = flattenVariants([
      { name: "Camisa Dry Fit", variants: [{ _id: "v1", color: "Preto", size: "M", sku: "CAM-P-M" }] },
    ]);
    expect(out).toEqual([{ variantId: "v1", label: "Camisa Dry Fit — Preto/M (CAM-P-M)" }]);
  });

  it("omits the dash separator when the variant has no color/size (single-variant product)", () => {
    const out = flattenVariants([{ name: "Touca Única", variants: [{ _id: "v1", sku: "TOUCA-1" }] }]);
    expect(out[0].label).toBe("Touca Única (TOUCA-1)");
  });

  it("skips a variant with no id instead of producing an unselectable option", () => {
    const out = flattenVariants([{ name: "X", variants: [{ sku: "no-id" }, { _id: "v2", sku: "has-id" }] }]);
    expect(out).toHaveLength(1);
    expect(out[0].variantId).toBe("v2");
  });

  it("flattens variants across multiple products", () => {
    const out = flattenVariants([
      { name: "A", variants: [{ _id: "v1", sku: "A1" }] },
      { name: "B", variants: [{ _id: "v2", sku: "B1" }] },
    ]);
    expect(out.map((o) => o.variantId)).toEqual(["v1", "v2"]);
  });
});

describe("transferErrorMessage", () => {
  it("blocks moving stock from a location to itself", () => {
    expect(transferErrorMessage("loc1", "loc1")).toMatch(/mesmo local/i);
  });

  it("allows a transfer between two different locations", () => {
    expect(transferErrorMessage("loc1", "loc2")).toBeNull();
  });

  it("doesn't false-positive on empty/unselected fields", () => {
    expect(transferErrorMessage("", "")).toBeNull();
  });
});
