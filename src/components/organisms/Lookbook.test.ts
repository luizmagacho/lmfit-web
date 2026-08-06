import { describe, expect, it } from "vitest";
import { resolveLookbookItems } from "./Lookbook";
import type { CatalogProduct } from "./ProductGrid";

const PRODUCT_A: CatalogProduct = {
  _id: "prod-a",
  name: "Camisa Real Madrid I 2024",
  priceRetail: 150,
  minWholesaleQty: 5,
  variants: [
    {
      _id: "variant-a1",
      sku: "FUT-CRMI-P",
      color: "Padrão",
      size: "P",
      price: "200,00",
      priceWholesale: "180,00",
      minWholesaleQty: 1,
      images: [],
    },
    {
      _id: "variant-a2",
      sku: "FUT-CRMI-M",
      color: "Padrão",
      size: "M",
      price: "210,00",
    },
  ],
  images: ["https://cdn.example.com/camisa.jpg"],
};

const PRODUCT_B: CatalogProduct = {
  _id: "prod-b",
  name: "Bermuda Treino",
  price: 90,
  variants: [{ _id: "variant-b1", sku: "BER-TR-G", size: "G" }],
};

const ITEMS = [PRODUCT_A, PRODUCT_B];

describe("resolveLookbookItems", () => {
  it("returns an empty list when no variant ids are configured", () => {
    expect(resolveLookbookItems(ITEMS, [])).toEqual([]);
  });

  it("ignores variant ids that don't match any product in the catalog", () => {
    expect(resolveLookbookItems(ITEMS, ["does-not-exist"])).toEqual([]);
  });

  it("resolves full cart-ready fields (price string parsing, product name, image) by variant id", () => {
    const [item] = resolveLookbookItems(ITEMS, ["variant-a1"]);
    expect(item).toMatchObject({
      variantId: "variant-a1",
      productId: "prod-a",
      productName: "Camisa Real Madrid I 2024",
      sku: "FUT-CRMI-P",
      color: "Padrão",
      size: "P",
      priceRetail: 200,
      priceWholesale: 180,
      minWholesaleQty: 1,
      imageUrl: "https://cdn.example.com/camisa.jpg",
    });
  });

  it("falls back to the parent product's price/minWholesaleQty when the variant doesn't override them", () => {
    const [item] = resolveLookbookItems([PRODUCT_B], ["variant-b1"]);
    expect(item.priceRetail).toBe(90);
    expect(item.priceWholesale).toBeNull();
    expect(item.minWholesaleQty).toBe(1);
  });

  it("resolves multiple variant ids across multiple products, preserving catalog order", () => {
    const resolved = resolveLookbookItems(ITEMS, ["variant-b1", "variant-a2"]);
    expect(resolved.map((r) => r.variantId)).toEqual(["variant-a2", "variant-b1"]);
  });
});
