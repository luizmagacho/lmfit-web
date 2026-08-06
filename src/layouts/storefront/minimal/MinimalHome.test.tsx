import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ThemePreset } from "@/theme/storefrontPresets";

vi.mock("@/components/organisms/TrustBar", () => ({
  TrustBar: () => <div data-testid="trust-bar" />,
}));

let mockPreset: ThemePreset = "monocromo";
vi.mock("@/context/TenantContext", () => ({
  useThemePreset: () => mockPreset,
}));

import { MinimalHome } from "./MinimalHome";
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

describe("MinimalHome — Loop 23 family split (Luxo/Wellness/Minimal)", () => {
  beforeEach(() => {
    mockPreset = "monocromo";
  });
  afterEach(cleanup);

  it("AC3: monocromo (Minimal/anti-design) keeps hero + grid + lookbook + coupon — regression zero", () => {
    mockPreset = "monocromo";
    render(<MinimalHome slots={slots} />);
    expect(screen.getByTestId("hero")).toBeDefined();
    expect(screen.getByTestId("grid")).toBeDefined();
    expect(screen.getByTestId("lookbook")).toBeDefined();
    expect(screen.getByTestId("coupon")).toBeDefined();
    expect(screen.queryByTestId("trust-bar")).toBeNull();
  });

  it("AC1: luxo drops lookbook and coupon entirely — 'cromo quase zero', even when the tenant configured both", () => {
    mockPreset = "luxo";
    render(<MinimalHome slots={slots} />);
    expect(screen.getByTestId("hero")).toBeDefined();
    expect(screen.getByTestId("grid")).toBeDefined();
    expect(screen.queryByTestId("lookbook")).toBeNull();
    expect(screen.queryByTestId("coupon")).toBeNull();
  });

  it("AC2: studio (Wellness) shows TrustBar before the grid, on top of the usual lookbook/coupon — CategoryChips moved to MinimalHeader in Loop V4-1", () => {
    mockPreset = "studio";
    render(<MinimalHome slots={slots} />);
    expect(screen.getByTestId("trust-bar")).toBeDefined();
    expect(screen.getByTestId("grid")).toBeDefined();
    expect(screen.getByTestId("lookbook")).toBeDefined();
    expect(screen.getByTestId("coupon")).toBeDefined();
  });
});
