import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PRESET,
  MIN_SAFE_CONTRAST,
  STOREFRONT_PRESETS,
  contrastRatio,
  isPaletteContrastSafe,
  resolveThemePreset,
  type ThemePreset,
} from "./storefrontPresets";

const EXPECTED_PRESETS: ThemePreset[] = [
  "essencial",
  "editorial",
  "performance",
  "luxo",
  "boutique",
  "vibrante",
  "studio",
  "streetwear",
  "impacto",
  "monocromo",
];

describe("STOREFRONT_PRESETS", () => {
  it("has exactly the 10 presets (8 originais §2.10 + luxo/streetwear do Loop 12), no more, no less", () => {
    expect(Object.keys(STOREFRONT_PRESETS).sort()).toEqual([...EXPECTED_PRESETS].sort());
  });

  it.each(EXPECTED_PRESETS)("preset %s has all required token fields populated", (key) => {
    const preset = STOREFRONT_PRESETS[key];
    expect(preset.label.length).toBeGreaterThan(0);
    expect(preset.fontDisplay.length).toBeGreaterThan(0);
    expect(preset.fontBody.length).toBeGreaterThan(0);
    expect(preset.radius).toBeGreaterThanOrEqual(0);
    expect(["solid", "ghost", "pill"]).toContain(preset.buttonStyle);
  });

  it("DEFAULT_THEME_PRESET is a real key in the table", () => {
    expect(STOREFRONT_PRESETS[DEFAULT_THEME_PRESET]).toBeDefined();
  });

  // Loop 4d
  it.each(EXPECTED_PRESETS)("preset %s has all Loop 4d token fields populated", (key) => {
    const preset = STOREFRONT_PRESETS[key];
    expect(preset.palette.bg).toMatch(/^#[0-9a-f]{6}$/i);
    expect(preset.palette.surface).toMatch(/^#[0-9a-f]{6}$/i);
    expect(preset.palette.text).toMatch(/^#[0-9a-f]{6}$/i);
    expect(preset.palette.textMuted).toMatch(/^#[0-9a-f]{6}$/i);
    expect(preset.palette.border).toMatch(/^#[0-9a-f]{6}$/i);
    expect(preset.cardAspectRatio.length).toBeGreaterThan(0);
    expect(preset.plpColumns.base).toMatch(/^grid-cols-\d+$/);
    expect(preset.plpColumns.sm).toMatch(/^sm:grid-cols-\d+$/);
    expect(preset.plpColumns.md).toMatch(/^md:grid-cols-\d+$/);
    expect(preset.motionDurationMs).toBeGreaterThan(0);
    expect(preset.motionEasing.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_PRESETS)("preset %s's palette passes the WCAG AA contrast floor (AC8)", (key) => {
    expect(isPaletteContrastSafe(STOREFRONT_PRESETS[key].palette)).toBe(true);
  });

  // Loop 4e
  it.each(EXPECTED_PRESETS)("preset %s has a valid heading typography token", (key) => {
    const heading = STOREFRONT_PRESETS[key].heading;
    expect(["none", "uppercase", "small-caps"]).toContain(heading.case);
    expect(heading.tracking.length).toBeGreaterThan(0);
    expect(heading.weight).toBeGreaterThanOrEqual(100);
    expect(heading.weight).toBeLessThanOrEqual(900);
  });

  it("Performance is bold uppercase, matching the benchmark's 'TÍTULOS EM CAIXA ALTA'", () => {
    const heading = STOREFRONT_PRESETS.performance.heading;
    expect(heading.case).toBe("uppercase");
    expect(heading.weight).toBeGreaterThanOrEqual(700);
  });

  it("Monocromo is thin uppercase with wide tracking, matching the benchmark", () => {
    const heading = STOREFRONT_PRESETS.monocromo.heading;
    expect(heading.case).toBe("uppercase");
    expect(heading.weight).toBeLessThanOrEqual(400);
    expect(parseFloat(heading.tracking)).toBeGreaterThan(0.1);
  });

  it("Boutique uses small-caps, matching the benchmark's 'small caps'", () => {
    expect(STOREFRONT_PRESETS.boutique.heading.case).toBe("small-caps");
  });

  it("Impacto is bold uppercase italic, matching 'leve itálico'", () => {
    const heading = STOREFRONT_PRESETS.impacto.heading;
    expect(heading.case).toBe("uppercase");
    expect(heading.italic).toBe(true);
    expect(heading.weight).toBeGreaterThanOrEqual(800);
  });

  // Loop 4f
  it.each(EXPECTED_PRESETS)("preset %s has a valid newBadgeLabel and plpGap", (key) => {
    const preset = STOREFRONT_PRESETS[key];
    expect(preset.newBadgeLabel.length).toBeGreaterThan(0);
    expect(preset.plpGap).toMatch(/^gap-\d+$/);
  });

  it("Performance's badge copy matches the benchmark's 'NOVO DROP'", () => {
    expect(STOREFRONT_PRESETS.performance.newBadgeLabel).toBe("NOVO DROP");
  });

  it("newBadgeLabel is distinct for at least half the presets (not a copy-pasted default)", () => {
    const labels = new Set(EXPECTED_PRESETS.map((key) => STOREFRONT_PRESETS[key].newBadgeLabel));
    expect(labels.size).toBeGreaterThanOrEqual(4);
  });

  // Loop 4h
  it.each(EXPECTED_PRESETS)("preset %s has a valid heroAspectRatio", (key) => {
    expect(STOREFRONT_PRESETS[key].heroAspectRatio).toMatch(/^\d+(\.\d+)? \/ \d+(\.\d+)?$/);
  });

  it("heroAspectRatio has real variation across presets (banner size actually differs)", () => {
    const ratios = new Set(EXPECTED_PRESETS.map((key) => STOREFRONT_PRESETS[key].heroAspectRatio));
    expect(ratios.size).toBeGreaterThanOrEqual(6);
  });

  // Loop 12 — famílias de layout
  it.each(EXPECTED_PRESETS)("preset %s has valid Loop 12 fields (layoutFamily/cardFrame/tagline)", (key) => {
    const preset = STOREFRONT_PRESETS[key];
    expect(["classic", "editorial", "minimal", "expressive", "industrial"]).toContain(preset.layoutFamily);
    expect(["border", "borderless", "hard-border"]).toContain(preset.cardFrame);
    expect(preset.tagline.length).toBeGreaterThan(0);
  });

  it("families group exactly as the plan's inspiration map (3 classic / 2 editorial / 3 minimal / 1 expressive / 1 industrial)", () => {
    const count = (fam: string) =>
      EXPECTED_PRESETS.filter((key) => STOREFRONT_PRESETS[key].layoutFamily === fam).length;
    expect(count("classic")).toBe(3);
    expect(count("editorial")).toBe(2);
    expect(count("minimal")).toBe(3);
    expect(count("expressive")).toBe(1);
    expect(count("industrial")).toBe(1);
  });

  it("legacy IDs kept stable while labels renamed (backend enum compatibility)", () => {
    expect(STOREFRONT_PRESETS.performance.label).toBe("Atlético");
    expect(STOREFRONT_PRESETS.studio.label).toBe("Wellness");
    expect(STOREFRONT_PRESETS.vibrante.label).toBe("Tropical");
    expect(STOREFRONT_PRESETS.monocromo.label).toBe("Minimal");
  });

  it("streetwear is the industrial preset: hard border, radius 0, mono body, quoted badge", () => {
    const s = STOREFRONT_PRESETS.streetwear;
    expect(s.cardFrame).toBe("hard-border");
    expect(s.radius).toBe(0);
    expect(s.fontBody).toBe("Space Mono");
    expect(s.newBadgeLabel).toContain("“");
  });

  it("luxo is minimal-family with borderless cards, 2-col PLP and generous gap", () => {
    const l = STOREFRONT_PRESETS.luxo;
    expect(l.layoutFamily).toBe("minimal");
    expect(l.cardFrame).toBe("borderless");
    expect(l.plpColumns.md).toBe("md:grid-cols-2");
    expect(l.plpGap).toBe("gap-10");
  });

  // Loop 19 — camada de composição
  it.each(EXPECTED_PRESETS)("preset %s has a valid composition token trio (gridComposition/heroComposition/sectionTexture)", (key) => {
    const preset = STOREFRONT_PRESETS[key];
    expect(["uniform", "mosaic", "asymmetric", "sparse-duo"]).toContain(preset.gridComposition);
    expect(["single", "media-first", "collage"]).toContain(preset.heroComposition);
    expect(["none", "color-card", "grain", "hard-frame"]).toContain(preset.sectionTexture);
  });

  it("AC1: exactly the 6 presets from the fidelity plan's default assignment stay all-default (uniform/single/none) — the zero-regression floor", () => {
    const allDefault = (key: ThemePreset) => {
      const p = STOREFRONT_PRESETS[key];
      return p.gridComposition === "uniform" && p.heroComposition === "single" && p.sectionTexture === "none";
    };
    const defaults = EXPECTED_PRESETS.filter(allDefault);
    expect(defaults.sort()).toEqual(["boutique", "essencial", "impacto", "monocromo", "studio"].sort());
  });

  it("vibrante (Tropical) gets the full non-default trio: mosaic + collage + color-card", () => {
    const v = STOREFRONT_PRESETS.vibrante;
    expect(v.gridComposition).toBe("mosaic");
    expect(v.heroComposition).toBe("collage");
    expect(v.sectionTexture).toBe("color-card");
  });

  it("editorial gets asymmetric grid + media-first hero, distinct from Tropical's mosaic/collage", () => {
    const e = STOREFRONT_PRESETS.editorial;
    expect(e.gridComposition).toBe("asymmetric");
    expect(e.heroComposition).toBe("media-first");
  });

  it("luxo gets sparse-duo grid only — hero/section stay default (a subtler touch than Tropical/Editorial)", () => {
    const l = STOREFRONT_PRESETS.luxo;
    expect(l.gridComposition).toBe("sparse-duo");
    expect(l.heroComposition).toBe("single");
    expect(l.sectionTexture).toBe("none");
  });

  it("streetwear gets grain section texture only — grid/hero stay default", () => {
    const s = STOREFRONT_PRESETS.streetwear;
    expect(s.gridComposition).toBe("uniform");
    expect(s.sectionTexture).toBe("grain");
  });

  it("performance (Atlético) gets media-first hero only — grid stays default", () => {
    const p = STOREFRONT_PRESETS.performance;
    expect(p.gridComposition).toBe("uniform");
    expect(p.heroComposition).toBe("media-first");
  });
});

describe("contrastRatio", () => {
  it("returns 21 (max) for pure black vs. pure white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("returns 1 (min) for identical colors", () => {
    expect(contrastRatio("#7c3aed", "#7c3aed")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    expect(contrastRatio("#111111", "#eeeeee")).toBeCloseTo(contrastRatio("#eeeeee", "#111111"), 5);
  });
});

describe("isPaletteContrastSafe", () => {
  it("rejects a palette with low text/background contrast", () => {
    expect(
      isPaletteContrastSafe({ bg: "#cccccc", surface: "#cccccc", text: "#d0d0d0", textMuted: "#999999", border: "#bbbbbb" }),
    ).toBe(false);
  });

  it("accepts a palette comfortably above the floor", () => {
    expect(
      isPaletteContrastSafe({ bg: "#ffffff", surface: "#f5f5f5", text: "#000000", textMuted: "#666666", border: "#dddddd" }),
    ).toBe(true);
  });

  it("MIN_SAFE_CONTRAST matches the WCAG AA normal-text floor", () => {
    expect(MIN_SAFE_CONTRAST).toBe(4.5);
  });
});

describe("resolveThemePreset", () => {
  it("returns the preset when it's a valid key", () => {
    expect(resolveThemePreset("monocromo")).toBe("monocromo");
  });

  it("falls back to the default for an unknown value", () => {
    expect(resolveThemePreset("does-not-exist")).toBe(DEFAULT_THEME_PRESET);
  });

  it("falls back to the default for undefined/null", () => {
    expect(resolveThemePreset(undefined)).toBe(DEFAULT_THEME_PRESET);
    expect(resolveThemePreset(null)).toBe(DEFAULT_THEME_PRESET);
  });
});
