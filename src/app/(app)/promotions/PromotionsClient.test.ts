import { describe, expect, it } from "vitest";
import { formatMaxUses, formatMinSubtotal, formatPromotionValue } from "./PromotionsClient";

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
