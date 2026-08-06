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
});
