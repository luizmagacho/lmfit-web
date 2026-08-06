import { describe, expect, it } from "vitest";
import {
  formatInfluencerCell,
  formatMaxUses,
  formatMinSubtotal,
  formatPromotionValue,
} from "./PromotionsClient";

describe("formatPromotionValue", () => {
  it("shows a percent coupon as a percentage", () => {
    expect(formatPromotionValue("percent", 10)).toBe("10%");
  });

  it("shows a fixed-value coupon as BRL currency, not a raw number", () => {
    expect(formatPromotionValue("fixed", 10)).toMatch(/R\$/);
  });
});

describe("formatMinSubtotal", () => {
  it("renders a dash when no minimum is set, not R$ 0,00", () => {
    expect(formatMinSubtotal(null)).toBe("—");
    expect(formatMinSubtotal(undefined)).toBe("—");
  });

  it("formats a set minimum as currency", () => {
    expect(formatMinSubtotal(50)).toMatch(/R\$/);
  });
});

describe("formatMaxUses", () => {
  it("shows 'Ilimitado' when no cap is set", () => {
    expect(formatMaxUses(undefined)).toBe("Ilimitado");
    expect(formatMaxUses(0)).toBe("Ilimitado");
  });

  it("shows the numeric cap when one is set", () => {
    expect(formatMaxUses(25)).toBe("25");
  });
});

describe("formatInfluencerCell", () => {
  const influencers = [
    { _id: "inf-1", name: "Ana Fit" },
    { _id: "inf-2", name: "Bruno Style" },
  ];

  it("shows a dash for a plain coupon with no influencer set", () => {
    expect(formatInfluencerCell(undefined, influencers)).toBe("—");
    expect(formatInfluencerCell("", influencers)).toBe("—");
  });

  it("resolves a matching id to the influencer's display name", () => {
    expect(formatInfluencerCell("inf-2", influencers)).toBe("Bruno Style");
  });

  it("AC: falls back to a dash instead of crashing when the id doesn't match any loaded influencer (e.g. list still loading, or stale reference)", () => {
    expect(formatInfluencerCell("inf-999", influencers)).toBe("—");
    expect(formatInfluencerCell("inf-1", null)).toBe("—");
  });
});
