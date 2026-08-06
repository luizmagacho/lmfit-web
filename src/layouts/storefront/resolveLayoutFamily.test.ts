import { describe, expect, it } from "vitest";
import { LAYOUT_FAMILIES, LAYOUT_FAMILY_LABELS, resolveLayoutFamily } from "./resolveLayoutFamily";
import { GOOGLE_FONT_WEIGHTS } from "@/context/TenantContext";
import { STOREFRONT_PRESETS, type ThemePreset } from "@/theme/storefrontPresets";

describe("resolveLayoutFamily (Loop 12)", () => {
  it("maps each preset to its family straight from the token table", () => {
    expect(resolveLayoutFamily("performance")).toBe("classic");
    expect(resolveLayoutFamily("editorial")).toBe("editorial");
    expect(resolveLayoutFamily("luxo")).toBe("minimal");
    expect(resolveLayoutFamily("vibrante")).toBe("expressive");
    expect(resolveLayoutFamily("streetwear")).toBe("industrial");
  });

  it("falls back to classic for unknown/undefined presets (via resolveThemePreset → essencial)", () => {
    expect(resolveLayoutFamily("does-not-exist")).toBe("classic");
    expect(resolveLayoutFamily(undefined)).toBe("classic");
    expect(resolveLayoutFamily(null)).toBe("classic");
  });

  it("LAYOUT_FAMILIES lists all 5 families exactly once, each with a label", () => {
    expect([...LAYOUT_FAMILIES].sort()).toEqual(
      ["classic", "editorial", "minimal", "expressive", "industrial"].sort(),
    );
    for (const fam of LAYOUT_FAMILIES) {
      expect(LAYOUT_FAMILY_LABELS[fam].length).toBeGreaterThan(0);
    }
  });
});

describe("GOOGLE_FONT_WEIGHTS (Loop 12 — fix do bug do Anton)", () => {
  it("covers every fontDisplay/fontBody used by any preset (css2 rejeita pesos inexistentes)", () => {
    for (const key of Object.keys(STOREFRONT_PRESETS) as ThemePreset[]) {
      const preset = STOREFRONT_PRESETS[key];
      expect(GOOGLE_FONT_WEIGHTS[preset.fontDisplay], `fontDisplay de ${key}`).toBeTruthy();
      expect(GOOGLE_FONT_WEIGHTS[preset.fontBody], `fontBody de ${key}`).toBeTruthy();
    }
  });

  it("Anton only requests weight 400 (the family's single weight)", () => {
    expect(GOOGLE_FONT_WEIGHTS.Anton).toBe("400");
  });

  it("Space Mono only requests 400/700 (the family's only weights)", () => {
    expect(GOOGLE_FONT_WEIGHTS["Space Mono"]).toBe("400;700");
  });
});
