import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { STOREFRONT_PRESETS } from "@/theme/storefrontPresets";
import type { CatalogProduct } from "./ProductGrid";

vi.mock("next/image", () => ({
  default: (props: { alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} />;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

let mockPreset = "essencial";
vi.mock("@/context/TenantContext", () => ({
  useThemeTokens: () => STOREFRONT_PRESETS[mockPreset as keyof typeof STOREFRONT_PRESETS],
}));

import { ProductGrid } from "./ProductGrid";

const product: CatalogProduct = {
  name: "Camiseta Teste",
  slug: "camiseta-teste",
  priceRetail: 99.9,
  createdAt: new Date().toISOString(), // isNew === true, so the "Lançamento" badge renders
};

describe("ProductGrid — Loop 20 sticker badges + hover motion", () => {
  beforeEach(() => {
    mockPreset = "essencial";
  });
  afterEach(cleanup);

  it("AC2: essencial (classic family) renders a plain badge — no sticker rotation", () => {
    mockPreset = "essencial";
    const { container } = render(<ProductGrid items={[product]} role="guest" />);
    const badge = container.querySelector(".rounded-full");
    expect(badge).not.toBeNull();
    expect(badge!.className).not.toContain("rotate");
  });

  it("AC1: vibrante (Tropical, expressive family) renders the badge with sticker rotation + shadow", () => {
    mockPreset = "vibrante";
    const { container } = render(<ProductGrid items={[product]} role="guest" />);
    const badge = container.querySelector(".rounded-full");
    expect(badge).not.toBeNull();
    expect(badge!.className).toContain("rotate-[-6deg]");
    expect(badge!.className).toContain("shadow-md");
  });

  it("AC3: the card link carries a hover-scale class and the shared motion-token style, for any preset", () => {
    mockPreset = "essencial";
    const { container } = render(<ProductGrid items={[product]} role="guest" />);
    const card = container.querySelector('a[href^="/loja/p/"]') as HTMLAnchorElement;
    expect(card.className).toContain("hover:scale-[1.03]");
    expect(card.style.transitionDuration).toBe("var(--kivoni-storefront-motion-duration)");
    expect(card.style.transitionTimingFunction).toBe("var(--kivoni-storefront-motion-easing)");
  });

  it("AC4: the same motion-token style is present for vibrante too — only its own preset CSS var resolves to the bounce curve, the component logic doesn't special-case it", () => {
    mockPreset = "vibrante";
    const { container } = render(<ProductGrid items={[product]} role="guest" />);
    const card = container.querySelector('a[href^="/loja/p/"]') as HTMLAnchorElement;
    expect(card.style.transitionTimingFunction).toBe("var(--kivoni-storefront-motion-easing)");
  });
});

describe("ProductGrid — Loop 21 numbered industrial index", () => {
  beforeEach(() => {
    mockPreset = "essencial";
  });
  afterEach(cleanup);

  const threeProducts: CatalogProduct[] = [
    { name: "Item A", slug: "item-a", priceRetail: 10 },
    { name: "Item B", slug: "item-b", priceRetail: 20 },
    { name: "Item C", slug: "item-c", priceRetail: 30 },
  ];

  it("AC2: no other preset shows the numbered seal", () => {
    mockPreset = "essencial";
    const { container } = render(<ProductGrid items={threeProducts} role="guest" />);
    expect(container.textContent).not.toContain("Nº");
  });

  it("AC1: streetwear numbers each visible card sequentially, starting at 0001", () => {
    mockPreset = "streetwear";
    const { container } = render(<ProductGrid items={threeProducts} role="guest" />);
    const seals = Array.from(container.querySelectorAll("span")).filter((s) => s.textContent?.startsWith("Nº"));
    expect(seals.map((s) => s.textContent)).toEqual(["Nº 0001", "Nº 0002", "Nº 0003"]);
  });
});
