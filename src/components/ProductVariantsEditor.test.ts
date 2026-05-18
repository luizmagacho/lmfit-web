import { describe, expect, it } from "vitest";
import { generateSkuSuggestion } from "./ProductVariantsEditor";

describe("generateSkuSuggestion", () => {
  it("generates correct SKU for simple names", () => {
    const sku = generateSkuSuggestion("Legging", "preto", "m");
    expect(sku).toBe("LGNG-PRE-M");
  });

  it("handles multi-word product names and removes Portuguese stop words", () => {
    const sku = generateSkuSuggestion("T-shirt com bolso", "Verde Limão", "GG");
    expect(sku).toBe("TSHRT-VL-GG");
  });

  it("handles empty or 'unico' color and size", () => {
    const sku = generateSkuSuggestion("Active Top", "Único", "Único");
    expect(sku).toBe("ACTVTOP");
  });

  it("normalizes accents and special characters", () => {
    const sku = generateSkuSuggestion("Calça Legging", "Azul-Marinho", "P");
    expect(sku).toBe("CLCLGNG-AM-P");
  });
});
