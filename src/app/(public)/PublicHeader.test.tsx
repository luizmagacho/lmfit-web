import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/loja",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/context/TenantContext", () => ({
  useTenant: () => ({ tenant: { name: "Loja Teste", storefront: { themePreset: "essencial" } } }),
}));

vi.mock("@/stores/useCatalogStore", () => ({
  useCatalogStore: (selector: (s: { setFilter: () => void }) => unknown) => selector({ setFilter: vi.fn() }),
}));

vi.mock("@/layouts/storefront/classic/ClassicHeader", () => ({
  ClassicHeader: () => <div data-testid="family-header" />,
}));
vi.mock("@/layouts/storefront/editorial/EditorialHeader", () => ({ EditorialHeader: () => null }));
vi.mock("@/layouts/storefront/minimal/MinimalHeader", () => ({ MinimalHeader: () => null }));
vi.mock("@/layouts/storefront/expressive/ExpressiveHeader", () => ({ ExpressiveHeader: () => null }));
vi.mock("@/layouts/storefront/industrial/IndustrialHeader", () => ({ IndustrialHeader: () => null }));

function setReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function scrollTo(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, writable: true, configurable: true });
  act(() => {
    fireEvent.scroll(window);
  });
}

import { PublicHeader } from "./PublicHeader";

describe("PublicHeader — Loop 25 hide-on-scroll", () => {
  beforeEach(() => {
    setReducedMotion(false);
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
  });
  afterEach(cleanup);

  function wrapperEl(): HTMLElement {
    return screen.getByTestId("family-header").parentElement as HTMLElement;
  }

  it("starts visible (translateY(0))", () => {
    render(<PublicHeader />);
    expect(wrapperEl().style.transform).toBe("translateY(0)");
  });

  it("AC1: hides (translateY(-100%)) once the page scrolls down past the threshold", () => {
    render(<PublicHeader />);
    scrollTo(50);
    scrollTo(150); // scrolling down, past the 80px threshold
    expect(wrapperEl().style.transform).toBe("translateY(-100%)");
  });

  it("AC1: comes back (translateY(0)) once the page scrolls back up", () => {
    render(<PublicHeader />);
    scrollTo(50);
    scrollTo(150);
    expect(wrapperEl().style.transform).toBe("translateY(-100%)");
    scrollTo(100); // scrolling up now
    expect(wrapperEl().style.transform).toBe("translateY(0)");
  });

  it("AC3: with prefers-reduced-motion, never hides — the scroll listener isn't even wired", () => {
    setReducedMotion(true);
    render(<PublicHeader />);
    scrollTo(50);
    scrollTo(300);
    expect(wrapperEl().style.transform).toBe("translateY(0)");
  });
});
