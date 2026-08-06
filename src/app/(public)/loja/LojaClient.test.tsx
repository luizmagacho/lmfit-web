import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { STOREFRONT_PRESETS } from "@/theme/storefrontPresets";

// Loop 19a — regression tests for the LojaClient → family Home dispatch. Each shared organism is
// stubbed with a `data-testid` marker so we can assert PRESENCE/ORDER (what the family dispatch
// controls) without needing full network/store simulation of each one's own internals.
vi.mock("@/lib/publicHttp", () => ({
  publicHttp: { get: vi.fn().mockResolvedValue({ data: { items: [] } }) },
}));

let mockPreset = "essencial";
vi.mock("@/context/TenantContext", () => ({
  useTenant: () => ({
    tenant: { name: "Loja Teste", storefront: { themePreset: mockPreset } },
    loading: false,
    slug: "teste",
  }),
  useThemeTokens: () => STOREFRONT_PRESETS[mockPreset as keyof typeof STOREFRONT_PRESETS],
  useThemePreset: () => mockPreset,
}));

vi.mock("@/components/organisms/HeroBanner", () => ({
  HeroBanner: () => <div data-testid="hero" />,
}));
vi.mock("@/components/organisms/TrustBar", () => ({
  TrustBar: () => <div data-testid="trustBar" />,
}));
vi.mock("@/components/organisms/CouponBanner", () => ({
  CouponBanner: () => <div data-testid="coupon" />,
}));
vi.mock("@/components/organisms/NewArrivalsShelf", () => ({
  NewArrivalsShelf: () => <div data-testid="newArrivals" />,
}));
vi.mock("@/components/organisms/CategoryTiles", () => ({
  CategoryTiles: () => <div data-testid="categoryTiles" />,
}));
vi.mock("@/components/organisms/Lookbook", () => ({
  Lookbook: () => <div data-testid="lookbook" />,
}));
vi.mock("@/components/organisms/CatalogFilters", () => ({
  CatalogFilters: () => <div data-testid="filters" />,
}));
vi.mock("@/components/organisms/ProductGrid", async () => {
  const actual = await vi.importActual<typeof import("@/components/organisms/ProductGrid")>(
    "@/components/organisms/ProductGrid",
  );
  return {
    ...actual,
    ProductGrid: () => <div data-testid="grid" />,
  };
});

import { LojaClient } from "./LojaClient";

function testIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-testid]")).map(
    (el) => el.dataset.testid as string,
  );
}

describe("LojaClient — family dispatch (Loop 19a)", () => {
  beforeEach(() => {
    mockPreset = "essencial";
  });
  afterEach(cleanup);

  it("AC2: classic (essencial) renders the historical order plus Loop 24's category tiles — hero, trustBar, coupon, categoryTiles, newArrivals, lookbook, filters, grid", async () => {
    mockPreset = "essencial";
    const { container } = render(<LojaClient />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    expect(testIds(container)).toEqual([
      "hero",
      "trustBar",
      "coupon",
      "categoryTiles",
      "newArrivals",
      "lookbook",
      "filters",
      "grid",
    ]);
  });

  it("AC1: editorial reorders — lookbook before the rail, no trust bar, filters/grid after coupon", async () => {
    mockPreset = "editorial";
    const { container } = render(<LojaClient />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    const ids = testIds(container);
    expect(ids).not.toContain("trustBar");
    expect(ids).not.toContain("newArrivals"); // editorial uses its own ProductRail, not the shelf
    expect(ids.indexOf("hero")).toBeLessThan(ids.indexOf("lookbook"));
    expect(ids.indexOf("lookbook")).toBeLessThan(ids.indexOf("filters"));
    expect(ids.indexOf("filters")).toBeLessThan(ids.indexOf("grid"));
  });

  it("AC4: minimal (luxo/monocromo family) omits trust bar and the new-arrivals shelf on purpose", async () => {
    mockPreset = "luxo";
    const { container } = render(<LojaClient />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    const ids = testIds(container);
    expect(ids).not.toContain("trustBar");
    expect(ids).not.toContain("newArrivals");
    expect(ids).toContain("hero");
    expect(ids).toContain("grid");
  });

  it("industrial (streetwear) renders the marquee tape and quoted section labels", async () => {
    mockPreset = "streetwear";
    const { container } = render(<LojaClient />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    expect(container.textContent).toContain("OFFICIAL STORE");
    expect(container.textContent).toContain("«PRODUCTS»");
  });

  it("expressive (vibrante/tropical) wraps new-arrivals and grid in colored surface cards", async () => {
    mockPreset = "vibrante";
    const { container } = render(<LojaClient />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    const ids = testIds(container);
    expect(ids).toEqual(["hero", "coupon", "newArrivals", "lookbook", "trustBar", "filters", "grid"]);
  });
});
