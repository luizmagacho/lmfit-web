import { describe, expect, it } from "vitest";
import {
  draftsFromProductRow,
  draftsToApiVariants,
  flattenFirstVariantOnRow,
  priceRangeFromRow,
  validateVariantDrafts,
} from "./variantDrafts";

describe("draftsFromProductRow", () => {
  it("returns one empty draft when row is null", () => {
    const d = draftsFromProductRow(null);
    expect(d).toHaveLength(1);
    expect(d[0].sku).toBe("");
    expect(d[0].color).toBe("Único");
  });

  it("reads nested variants", () => {
    const d = draftsFromProductRow({
      _id: "p1",
      variants: [
        { _id: "a", sku: "X-1", color: "Preto", size: "M", price: 10, quantityInStock: 2 },
      ],
    });
    expect(d).toHaveLength(1);
    expect(d[0].serverId).toBe("a");
    expect(d[0].sku).toBe("X-1");
    expect(d[0].quantityInStock).toBe(2);
  });

  it("uses quantityOnHand when quantityInStock missing", () => {
    const d = draftsFromProductRow({
      variants: [{ _id: "v", sku: "S", price: 1, quantityOnHand: 5 }],
    });
    expect(d[0].quantityInStock).toBe(5);
  });

  it("falls back to flat product", () => {
    const d = draftsFromProductRow({
      _id: "p9",
      sku: "FLAT",
      price: 99.9,
      quantityInStock: 3,
    });
    expect(d[0].sku).toBe("FLAT");
    expect(d[0].price).toBeCloseTo(99.9);
    expect(d[0].quantityInStock).toBe(3);
  });
});

describe("draftsToApiVariants", () => {
  it("maps quantity to both stock keys", () => {
    const api = draftsToApiVariants([
      {
        clientKey: "k",
        sku: "A",
        color: "Azul",
        size: "P",
        price: 12,
        quantityInStock: 4,
        acceptsBackorder: false,
        backorderMinQty: 1,
        priceManuallySet: false,
      },
    ]);
    expect(api[0].quantityInStock).toBe(4);
    expect(api[0].quantityOnHand).toBe(4);
  });
});

describe("validateVariantDrafts", () => {
  it("rejects duplicate skus", () => {
    expect(
      validateVariantDrafts([
        { clientKey: "1", sku: "A", color: "", size: "", price: 1, quantityInStock: 0, acceptsBackorder: false, backorderMinQty: 1, priceManuallySet: false },
        { clientKey: "2", sku: "a", color: "", size: "", price: 1, quantityInStock: 0, acceptsBackorder: false, backorderMinQty: 1, priceManuallySet: false },
      ]),
    ).toMatch(/duplicado/i);
  });
});

describe("flattenFirstVariantOnRow", () => {
  it("copies first variant sku to top level", () => {
    const row = flattenFirstVariantOnRow({
      name: "Legging",
      variants: [{ _id: "v1", sku: "L-P", price: 80, quantityInStock: 1 }],
    });
    expect(row.sku).toBe("L-P");
    expect(row.price).toBe(80);
    expect(row.quantityInStock).toBe(1);
  });
});

describe("priceRangeFromRow", () => {
  it("returns null when the row has no variants", () => {
    expect(priceRangeFromRow({})).toBeNull();
    expect(priceRangeFromRow({ variants: [] })).toBeNull();
  });

  it("returns min and max across variant prices", () => {
    const row = { variants: [{ price: 55 }, { price: 80 }, { price: 60 }] };
    expect(priceRangeFromRow(row)).toEqual({ min: 55, max: 80 });
  });

  it("returns equal min/max when all variants share one price", () => {
    const row = { variants: [{ price: 99.9 }, { price: 99.9 }] };
    expect(priceRangeFromRow(row)).toEqual({ min: 99.9, max: 99.9 });
  });

  it("ignores variants without a usable price", () => {
    const row = { variants: [{ price: 55 }, { sku: "X" }, { price: "80,00" }] };
    expect(priceRangeFromRow(row)).toEqual({ min: 55, max: 80 });
  });
});

describe("draftsFromProductRow — priceManuallySet", () => {
  it("marks variants whose saved price differs from the cost+markup computed price", () => {
    const drafts = draftsFromProductRow({
      sourceType: "ready_made",
      costPrice: 40,
      markupPercent: 37.5, // computed = 55.00
      variants: [
        { _id: "a", sku: "A", price: 55 },
        { _id: "b", sku: "B", price: 80 },
      ],
    });
    expect(drafts.map((d) => d.priceManuallySet)).toEqual([false, true]);
  });

  it("never marks variants of manufactured products", () => {
    const drafts = draftsFromProductRow({
      sourceType: "manufactured",
      variants: [
        { _id: "a", sku: "A", price: 55 },
        { _id: "b", sku: "B", price: 80 },
      ],
    });
    expect(drafts.every((d) => !d.priceManuallySet)).toBe(true);
  });

  it("starts unmarked for a brand-new product", () => {
    const drafts = draftsFromProductRow(null);
    expect(drafts[0].priceManuallySet).toBe(false);
  });
});
