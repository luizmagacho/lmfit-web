import { describe, expect, it } from "vitest";
import {
  formatBRLInputDisplay,
  isBRLMoneyField,
  maskBrazilPhone,
  parseBRLMoneyInput,
} from "./inputMasks";

describe("isBRLMoneyField", () => {
  it("identifica preço e totais", () => {
    expect(isBRLMoneyField("price")).toBe(true);
    expect(isBRLMoneyField("compareAtPrice")).toBe(true);
    expect(isBRLMoneyField("quantityInStock")).toBe(false);
  });
});

describe("parseBRLMoneyInput / formatBRLInputDisplay", () => {
  it("acumula centavos a partir dos dígitos", () => {
    expect(parseBRLMoneyInput("1999")).toBe("19.99");
    expect(parseBRLMoneyInput("R$ 10,00")).toBe("10.00");
  });

  it("formata decimal para exibição", () => {
    expect(formatBRLInputDisplay("19.99")).toMatch(/19,99/);
    expect(formatBRLInputDisplay("")).toBe("");
  });
});

describe("maskBrazilPhone", () => {
  it("máscara local 11 dígitos", () => {
    expect(maskBrazilPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("prefixo 55", () => {
    expect(maskBrazilPhone("5511987654321")).toContain("+55");
    expect(maskBrazilPhone("5511987654321")).toContain("(11)");
  });
});
