import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ThemePreset } from "@/theme/storefrontPresets";
import { STOREFRONT_PRESETS } from "@/theme/storefrontPresets";

vi.mock("@/components/organisms/CategoryTiles", () => ({
  CategoryTiles: () => <div data-testid="category-tiles" />,
}));
vi.mock("@/components/organisms/ProductRail", () => ({
  ProductRail: ({ title }: { title?: string }) => <div data-testid="product-rail">{title}</div>,
}));

let mockPreset: ThemePreset = "essencial";
vi.mock("@/context/TenantContext", () => ({
  useThemePreset: () => mockPreset,
  useThemeTokens: () => STOREFRONT_PRESETS[mockPreset as keyof typeof STOREFRONT_PRESETS],
}));

import { ClassicHome } from "./ClassicHome";
import type { HomeSlots } from "../types";

const slots: HomeSlots = {
  hero: <div data-testid="hero" />,
  hasHero: true,
  trustBar: <div data-testid="trust-bar" />,
  coupon: <div data-testid="coupon" />,
  lookbook: <div data-testid="lookbook" />,
  newArrivals: <div data-testid="new-arrivals" />,
  filtersBlock: <div data-testid="filters" />,
  grid: <div data-testid="grid" />,
  newItems: [],
};

describe("ClassicHome — Loop 24/V4-3 family split (Essencial/Atlético/Impacto)", () => {
  beforeEach(() => {
    mockPreset = "essencial";
  });
  afterEach(cleanup);

  it("AC3: impacto keeps the historical newArrivals shelf, no category tiles, no rail — regression floor", () => {
    mockPreset = "impacto";
    render(<ClassicHome slots={slots} />);
    expect(screen.getByTestId("new-arrivals")).toBeDefined();
    expect(screen.queryByTestId("category-tiles")).toBeNull();
    expect(screen.queryByTestId("product-rail")).toBeNull();
  });

  it("V4-3: impacto gets its own animated marquee band (repeats newBadgeLabel), essencial/atlético don't", () => {
    mockPreset = "impacto";
    render(<ClassicHome slots={slots} />);
    const marquee = screen.getByTestId("impacto-marquee");
    expect(marquee.textContent).toContain("LANÇAMENTO");

    cleanup();
    mockPreset = "essencial";
    render(<ClassicHome slots={slots} />);
    expect(screen.queryByTestId("impacto-marquee")).toBeNull();

    cleanup();
    mockPreset = "performance";
    render(<ClassicHome slots={slots} />);
    expect(screen.queryByTestId("impacto-marquee")).toBeNull();
  });

  it("AC1: essencial shows CategoryTiles alongside the usual newArrivals shelf", () => {
    mockPreset = "essencial";
    render(<ClassicHome slots={slots} />);
    expect(screen.getByTestId("category-tiles")).toBeDefined();
    expect(screen.getByTestId("new-arrivals")).toBeDefined();
    expect(screen.queryByTestId("product-rail")).toBeNull();
  });

  it("AC2: performance (Atlético) swaps the newArrivals shelf for a ProductRail titled with the preset's own newBadgeLabel ('NOVO DROP')", () => {
    mockPreset = "performance";
    render(<ClassicHome slots={slots} />);
    expect(screen.getByTestId("product-rail").textContent).toBe("NOVO DROP");
    expect(screen.queryByTestId("new-arrivals")).toBeNull();
    expect(screen.queryByTestId("category-tiles")).toBeNull();
  });
});
