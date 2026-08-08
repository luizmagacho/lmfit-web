import { describe, expect, it } from "vitest";
import { resolveSwatchColor } from "./colorSwatch";

describe("resolveSwatchColor", () => {
  it("resolves a recognized PT-BR color name to a hex value", () => {
    expect(resolveSwatchColor("Preto")).toBe("#111111");
  });

  it("is case/whitespace insensitive", () => {
    expect(resolveSwatchColor("  PRETO  ")).toBe("#111111");
  });

  it("resolves a two-word color name", () => {
    expect(resolveSwatchColor("Azul Marinho")).toBe("#1e3a8a");
  });

  it("falls back to null for an unrecognized name (e.g. 'Padrão')", () => {
    expect(resolveSwatchColor("Padrão")).toBeNull();
  });

  it("falls back to null for empty/undefined/null input", () => {
    expect(resolveSwatchColor("")).toBeNull();
    expect(resolveSwatchColor(undefined)).toBeNull();
    expect(resolveSwatchColor(null)).toBeNull();
  });

  // Regressão: o catálogo real (LM FIT) grava a mesma cor com e sem acento em produtos
  // diferentes ("Lilás" e "Lilas") — as duas precisam cair na mesma bolinha colorida, não uma
  // colorida e a outra em branco/neutra.
  it("resolves accented and unaccented spellings of the same color to the same hex", () => {
    expect(resolveSwatchColor("Lilás")).toBe(resolveSwatchColor("Lilas"));
    expect(resolveSwatchColor("Lilás")).not.toBeNull();
  });

  it.each([
    "Amarela",
    "Azul Bic",
    "Azul Petróleo",
    "Bordo",
    "Cappuccino",
    "Champagne",
    "Figo",
    "Manteiga",
    "Marinho",
    "Marsala",
    "Off",
    "Oliva",
    "Pérola",
    "Pink",
    "Rose",
    "Terra-cota",
    "Uva",
  ])("resolves the real catalog color '%s' to a hex value, not the neutral fallback", (name) => {
    expect(resolveSwatchColor(name)).not.toBeNull();
  });

  it("tolerates the 'Verdo' typo seen in real product data as green", () => {
    expect(resolveSwatchColor("Verdo")).toBe(resolveSwatchColor("Verde"));
  });

  it("resolves a '<cor> Transparente' variant to its base color instead of the neutral fallback", () => {
    expect(resolveSwatchColor("Azul Transparente")).toBe(resolveSwatchColor("Azul"));
    expect(resolveSwatchColor("Cinza Transparente")).toBe(resolveSwatchColor("Cinza"));
    expect(resolveSwatchColor("Oliva Transparente")).toBe(resolveSwatchColor("Oliva"));
  });
});
