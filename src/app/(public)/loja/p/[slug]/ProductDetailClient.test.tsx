import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { STOREFRONT_PRESETS } from "@/theme/storefrontPresets";

// Loop 19a — regression tests for the ProductDetailClient → family PDP dispatch. Heavy leaves are
// stubbed with `data-testid` markers so we assert what the family dispatch actually controls
// (which structure renders) without simulating each leaf's own network/state internals.
const { mockProduct } = vi.hoisted(() => ({
  mockProduct: {
    _id: "p1",
    name: "Camiseta Teste",
    slug: "camiseta-teste",
    description: "Uma camiseta",
    category: "camisetas",
    images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
  },
}));

vi.mock("@/lib/publicHttp", () => ({
  publicHttp: { get: vi.fn().mockResolvedValue({ data: mockProduct }) },
}));

vi.mock("@/lib/productImageUrl", () => ({
  resolveProductImageUrls: () => ["https://example.com/a.jpg", "https://example.com/b.jpg"],
}));

let mockPreset = "essencial";
vi.mock("@/context/TenantContext", () => ({
  useTenant: () => ({
    tenant: { name: "Loja Teste", storefront: { themePreset: mockPreset } },
    loading: false,
    slug: "teste",
  }),
  useThemeTokens: () => STOREFRONT_PRESETS[mockPreset as keyof typeof STOREFRONT_PRESETS],
}));

vi.mock("@/components/organisms/VariantSelector", () => ({
  VariantSelector: () => <div data-testid="variantSelector" />,
}));
vi.mock("@/components/organisms/RelatedProducts", () => ({
  RelatedProducts: () => <div data-testid="related" />,
}));
vi.mock("@/components/organisms/ProductReviews", () => ({
  ProductReviews: () => <div data-testid="reviews" />,
}));
vi.mock("@/components/atoms/WishlistHeartButton", () => ({
  WishlistHeartButton: () => <div data-testid="wishlist" />,
}));
vi.mock("@/components/ImageCarousel", () => ({
  ImageCarousel: () => <div data-testid="carousel" />,
}));

import { ProductDetailClient } from "./ProductDetailClient";

function testIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-testid]")).map(
    (el) => el.dataset.testid as string,
  );
}

describe("ProductDetailClient — family PDP dispatch (Loop 19a)", () => {
  beforeEach(() => {
    mockPreset = "essencial";
  });
  afterEach(cleanup);

  it("classic (essencial) renders gallery + info in the two-column ClassicPDP structure", async () => {
    mockPreset = "essencial";
    const { container } = render(<ProductDetailClient slug="camiseta-teste" />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    const ids = testIds(container);
    expect(ids).toEqual(["carousel", "wishlist", "variantSelector", "related", "reviews"]);
    expect(container.textContent).toContain("Camiseta Teste");
  });

  it("AC3: streetwear (industrial) renders the moodboard grid with quoted product name label instead of the carousel, for a product with 2+ photos", async () => {
    mockPreset = "streetwear";
    const { container } = render(<ProductDetailClient slug="camiseta-teste" />);
    await waitFor(() => expect(container.textContent).toContain("Camiseta Teste"));

    // 2+ photos → IndustrialPDP renders its own <Image> grid, bypassing the carousel slot entirely.
    expect(testIds(container)).not.toContain("carousel");
    expect(container.textContent).toContain("“Camiseta Teste”");
  });

  it("editorial renders the wider 3/5-gallery structure with the same slot content", async () => {
    mockPreset = "editorial";
    const { container } = render(<ProductDetailClient slug="camiseta-teste" />);
    await waitFor(() => expect(testIds(container).length).toBeGreaterThan(0));

    expect(testIds(container)).toEqual(["carousel", "wishlist", "variantSelector", "related", "reviews"]);
  });

  it("every family still surfaces variantSelector/related/reviews — buying and discovery never disappear", async () => {
    for (const preset of ["essencial", "editorial", "luxo", "vibrante", "streetwear"]) {
      mockPreset = preset;
      const { container, unmount } = render(<ProductDetailClient slug="camiseta-teste" />);
      await waitFor(() => expect(container.textContent).toContain("Camiseta Teste"));
      const ids = testIds(container);
      expect(ids).toContain("variantSelector");
      expect(ids).toContain("related");
      expect(ids).toContain("reviews");
      unmount();
    }
  });
});
