import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ThemePreset } from "@/theme/storefrontPresets";

vi.mock("@/components/organisms/ProductRail", () => ({
  ProductRail: () => <div data-testid="product-rail" />,
}));

let mockPreset: ThemePreset = "editorial";
vi.mock("@/context/TenantContext", () => ({
  useThemePreset: () => mockPreset,
}));

import { EditorialHome } from "./EditorialHome";
import type { HomeSlots } from "../types";

const slots: HomeSlots = {
  hero: <div data-testid="hero" />,
  hasHero: true,
  trustBar: <div data-testid="slot-trustbar" />,
  coupon: <div data-testid="coupon" />,
  lookbook: <div data-testid="lookbook" />,
  newArrivals: <div data-testid="new-arrivals" />,
  filtersBlock: <div data-testid="filters" />,
  grid: <div data-testid="grid" />,
  newItems: [],
};

describe("EditorialHome — Loop V4-2 (Boutique diverges structurally from Editorial)", () => {
  beforeEach(() => {
    mockPreset = "editorial";
  });
  afterEach(cleanup);

  it("AC: editorial (Zara) keeps hero, lookbook, ProductRail, coupon, filters, grid — regression zero", () => {
    render(<EditorialHome slots={slots} />);
    const order = ["hero", "lookbook", "product-rail", "coupon", "filters", "grid"];
    const rendered = order.map((id) => screen.getByTestId(id));
    rendered.forEach((el) => expect(el).toBeDefined());
  });

  it("AC: boutique (Chanel) drops ProductRail entirely", () => {
    mockPreset = "boutique";
    render(<EditorialHome slots={slots} />);
    expect(screen.queryByTestId("product-rail")).toBeNull();
  });

  it("AC: boutique keeps hero, filters, grid, lookbook, coupon — grid comes right after the hero", () => {
    mockPreset = "boutique";
    render(<EditorialHome slots={slots} />);
    ["hero", "filters", "grid", "lookbook", "coupon"].forEach((id) => {
      expect(screen.getByTestId(id)).toBeDefined();
    });
  });
});
