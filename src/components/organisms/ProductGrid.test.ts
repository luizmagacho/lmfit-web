import { describe, expect, it } from "vitest";
import {
  buildCardImageSizes,
  gridCompositionSpanClass,
  isAsymmetricFeatureTile,
  isMosaicFeatureTile,
  isSparseDuoOffset,
} from "./ProductGrid";

describe("buildCardImageSizes (Loop 10 v2 — sizes real por preset, não um número chutado)", () => {
  it("derives column counts straight from the preset's own grid-cols-N classes", () => {
    const sizes = buildCardImageSizes({
      base: "grid-cols-2",
      sm: "sm:grid-cols-3",
      md: "md:grid-cols-4",
    });
    // container público é max-w-3xl (768px): md: usa esse teto, não 100vw
    expect(sizes).toBe("(min-width: 768px) 192px, (min-width: 640px) 33vw, 50vw");
  });

  it("handles a 1-column preset (e.g. minimal family) without dividing by a wrong number", () => {
    const sizes = buildCardImageSizes({
      base: "grid-cols-1",
      sm: "sm:grid-cols-2",
      md: "md:grid-cols-2",
    });
    expect(sizes).toBe("(min-width: 768px) 384px, (min-width: 640px) 50vw, 100vw");
  });

  it("orders conditions widest-first so the browser's first-match media query wins correctly", () => {
    const sizes = buildCardImageSizes({
      base: "grid-cols-2",
      sm: "sm:grid-cols-3",
      md: "md:grid-cols-4",
    });
    const minWidth768Index = sizes.indexOf("min-width: 768px");
    const minWidth640Index = sizes.indexOf("min-width: 640px");
    expect(minWidth768Index).toBeGreaterThanOrEqual(0);
    expect(minWidth640Index).toBeGreaterThan(minWidth768Index);
  });
});

describe("Loop 19 — gridComposition helpers", () => {
  it("AC2: mosaic (Tropical) flags one feature tile every 6 items, starting at index 0", () => {
    expect(isMosaicFeatureTile(0)).toBe(true);
    expect([1, 2, 3, 4, 5].map(isMosaicFeatureTile)).toEqual([false, false, false, false, false]);
    expect(isMosaicFeatureTile(6)).toBe(true);
    expect(isMosaicFeatureTile(12)).toBe(true);
    expect(isMosaicFeatureTile(7)).toBe(false);
  });

  it("AC3: asymmetric (Editorial) flags a widened tile every 5 items — a different, more discreet rhythm than mosaic", () => {
    expect(isAsymmetricFeatureTile(0)).toBe(true);
    expect(isAsymmetricFeatureTile(5)).toBe(true);
    expect(isAsymmetricFeatureTile(10)).toBe(true);
    expect(isAsymmetricFeatureTile(6)).toBe(false);
  });

  it("AC4: sparse-duo (Luxo) offsets every odd index — the alternating-height rhythm", () => {
    expect(isSparseDuoOffset(0)).toBe(false);
    expect(isSparseDuoOffset(1)).toBe(true);
    expect(isSparseDuoOffset(2)).toBe(false);
    expect(isSparseDuoOffset(3)).toBe(true);
  });

  it("AC1: uniform composition never produces a span class, at any index (regression floor for the 6 default presets)", () => {
    for (let i = 0; i < 20; i++) {
      expect(gridCompositionSpanClass("uniform", i)).toBe("");
    }
  });

  it("mosaic produces a 2×2 span class only on its feature tiles, empty otherwise", () => {
    expect(gridCompositionSpanClass("mosaic", 0)).toBe("sm:col-span-2 sm:row-span-2");
    expect(gridCompositionSpanClass("mosaic", 1)).toBe("");
  });

  it("asymmetric produces a width-only span class (no row-span) — visually more discreet than mosaic", () => {
    expect(gridCompositionSpanClass("asymmetric", 0)).toBe("sm:col-span-2");
    expect(gridCompositionSpanClass("asymmetric", 0)).not.toContain("row-span");
    expect(gridCompositionSpanClass("asymmetric", 2)).toBe("");
  });

  it("sparse-duo never produces a span class — its rhythm comes from the offset, not spans", () => {
    expect(gridCompositionSpanClass("sparse-duo", 0)).toBe("");
    expect(gridCompositionSpanClass("sparse-duo", 1)).toBe("");
  });
});
