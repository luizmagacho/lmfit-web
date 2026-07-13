import { describe, expect, it } from "vitest";
import { emptyLine, floatToBRL, linesToLocal, maskBRL, parseBRL, parseLinesPayload, type LocalLine } from "./PurchaseEditorClient";

function line(overrides: Partial<LocalLine> = {}): LocalLine {
  return { ...emptyLine("k"), ...overrides };
}

describe("floatToBRL", () => {
  // Regression: the purchase editor showed a blank unit price when reopening a saved
  // purchase because the API returns money fields as pt-BR strings ("45,90") and this
  // used to do a plain Number() on them, which is NaN for a comma decimal.
  it("formats a pt-BR string value from the API, not just a raw number", () => {
    expect(floatToBRL("45,90")).toMatch(/45,90/);
    expect(floatToBRL(45.9)).toMatch(/45,90/);
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(floatToBRL(null)).toBe("");
    expect(floatToBRL(undefined)).toBe("");
    expect(floatToBRL("")).toBe("");
  });
});

describe("maskBRL / parseBRL — digit-as-cents input mask", () => {
  it("accumulates typed digits as cents", () => {
    expect(maskBRL("1999")).toMatch(/19,99/);
  });

  it("round-trips maskBRL output back through parseBRL", () => {
    expect(parseBRL(maskBRL("4590"))).toBe(45.9);
  });

  it("parseBRL returns 0 for no digits", () => {
    expect(parseBRL("")).toBe(0);
  });
});

describe("linesToLocal — loading a saved purchase into the editor", () => {
  it("returns a single empty line when the purchase has no lines yet", () => {
    const out = linesToLocal([], () => "k1");
    expect(out).toHaveLength(1);
    expect(out[0].variantId).toBe("");
  });

  it("classifies a line by materialId presence, not a lost itemType flag", () => {
    const out = linesToLocal(
      [
        { variantId: "v1", quantityOrdered: 5, unitPrice: 10 },
        { materialId: "m1", quantityOrdered: 2, unitPrice: 3 },
      ],
      () => "k",
    );
    expect(out[0].itemType).toBe("variant");
    expect(out[1].itemType).toBe("material");
  });

  // Regression: this is the exact bug reported in production — unitPrice arrived as a
  // pt-BR string from the API and used to render blank.
  it("keeps the saved unit price visible instead of blanking it", () => {
    const out = linesToLocal([{ variantId: "v1", quantityOrdered: 1, unitPrice: "45,90" }], () => "k1");
    expect(out[0].unitPrice).toMatch(/45,90/);
  });

  it("preserves a material line's rawName and materialId (a prior bug silently dropped non-variant lines entirely)", () => {
    const out = linesToLocal([{ materialId: "m1", rawName: "Zíper 20cm", quantityOrdered: 10, unitPrice: 1.5 }], () => "k1");
    expect(out[0].itemType).toBe("material");
    expect(out[0].materialId).toBe("m1");
    expect(out[0].rawName).toBe("Zíper 20cm");
  });
});

describe("parseLinesPayload — building the save request", () => {
  it("skips a variant row with nothing selected", () => {
    const out = parseLinesPayload([line({ itemType: "variant", variantId: "", rawName: "" })]);
    expect(out).toHaveLength(0);
  });

  it("sends variantId for an existing-variant row", () => {
    const out = parseLinesPayload([line({ itemType: "variant", variantId: "v1", quantityOrdered: "3", unitPrice: maskBRL("1000") })]);
    expect(out[0]).toMatchObject({ variantId: "v1", quantityOrdered: 3, unitPrice: 10 });
  });

  it("sends a material line with materialId", () => {
    const out = parseLinesPayload([line({ itemType: "material", materialId: "m1", quantityOrdered: "2" })]);
    expect(out[0]).toMatchObject({ materialId: "m1" });
  });

  describe("new-variant / new-product lines", () => {
    it("skips an incomplete new-variant row (no product, no SKU)", () => {
      const out = parseLinesPayload([line({ itemType: "variant", isNewVariant: true, newProductId: "", newProductLabel: "", newSku: "" })]);
      expect(out).toHaveLength(0);
    });

    it("uses newVariant.productId when an existing product was picked", () => {
      const out = parseLinesPayload([
        line({ itemType: "variant", isNewVariant: true, newProductId: "p1", newProductLabel: "Conjunto Flow", newSku: "CF-PT-M", newColor: "Preto", newSize: "M" }),
      ]);
      expect(out[0].newVariant).toMatchObject({ productId: "p1", sku: "CF-PT-M", color: "Preto", size: "M" });
      expect(out[0].newVariant.newProductName).toBeUndefined();
    });

    // Regression: the exact new feature — a brand-new product typed in the "creatable"
    // picker has no _id yet, so the line must carry newProductName instead of productId.
    it("uses newVariant.newProductName when the product doesn't exist yet", () => {
      const out = parseLinesPayload([
        line({ itemType: "variant", isNewVariant: true, newProductId: "", newProductLabel: "Conjunto Novo", newSku: "CN-PT-G", newColor: "Preto", newSize: "G" }),
      ]);
      expect(out[0].newVariant).toMatchObject({ newProductName: "Conjunto Novo", sku: "CN-PT-G" });
      expect(out[0].newVariant.productId).toBeUndefined();
    });

    it("omits price from newVariant when left blank (server defaults it)", () => {
      const out = parseLinesPayload([
        line({ itemType: "variant", isNewVariant: true, newProductId: "p1", newProductLabel: "X", newSku: "SKU-1", newPrice: "" }),
      ]);
      expect(out[0].newVariant.price).toBeUndefined();
    });
  });
});
