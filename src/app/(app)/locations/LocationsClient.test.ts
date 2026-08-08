import { describe, expect, it } from "vitest";
import { flattenProducts, flattenVariants, transferErrorMessage } from "./LocationsClient";

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

  // Regression: the API returns products sorted by creation date, not name — with 100+ SKUs
  // (a real tenant's catalog) an unsorted picker is only usable by scrolling the whole list.
  it("sorts alphabetically by label regardless of the input order", () => {
    const out = flattenVariants([
      { name: "Top Essencial", variants: [{ _id: "v3", sku: "TOP-1" }] },
      { name: "Corta-vento Cover", variants: [{ _id: "v1", sku: "CV-1" }] },
      { name: "Blusa Peluciada", variants: [{ _id: "v2", sku: "BP-1" }] },
    ]);
    expect(out.map((o) => o.variantId)).toEqual(["v2", "v1", "v3"]);
  });
});

describe("flattenProducts", () => {
  it("groups variants under their product, keeping color/size/sku per line", () => {
    const out = flattenProducts([
      {
        _id: "p1",
        name: "Corta-vento Cover",
        variants: [
          { _id: "v1", sku: "CRTVNT-PRE", color: "Preto" },
          { _id: "v2", sku: "CRTVNT-BRA", color: "Branco" },
        ],
      },
    ]);
    expect(out).toEqual([
      {
        productId: "p1",
        name: "Corta-vento Cover",
        variants: [
          { variantId: "v1", sku: "CRTVNT-PRE", color: "Preto", size: undefined },
          { variantId: "v2", sku: "CRTVNT-BRA", color: "Branco", size: undefined },
        ],
      },
    ]);
  });

  it("skips a product with no id or no variants — nothing to add to a transfer either way", () => {
    const out = flattenProducts([
      { name: "Sem ID", variants: [{ _id: "v1", sku: "X" }] },
      { _id: "p2", name: "Sem variantes", variants: [] },
    ]);
    expect(out).toEqual([]);
  });

  // Same regression as flattenVariants: the "Adicionar produto" picker needs to be
  // alphabetical, not creation-date order, to be usable with a real-size catalog.
  it("sorts products alphabetically by name", () => {
    const out = flattenProducts([
      { _id: "p3", name: "Top Essencial", variants: [{ _id: "v3", sku: "T" }] },
      { _id: "p1", name: "Corta-vento Cover", variants: [{ _id: "v1", sku: "C" }] },
      { _id: "p2", name: "Blusa Peluciada", variants: [{ _id: "v2", sku: "B" }] },
    ]);
    expect(out.map((p) => p.productId)).toEqual(["p2", "p1", "p3"]);
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
