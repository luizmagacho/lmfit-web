import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { STOREFRONT_PRESETS } from "@/theme/storefrontPresets";
import type { CatalogProduct } from "./ProductGrid";

vi.mock("@/stores/useCartStore", () => ({
  useCartStore: () => ({ addOrIncrement: vi.fn(), open: vi.fn() }),
}));

let mockPreset = "essencial";
let mockLookbook: { title: string; imageUrl: string; variantIds: string[] } | undefined;
vi.mock("@/context/TenantContext", () => ({
  useTenant: () => ({ tenant: { storefront: { lookbook: mockLookbook } } }),
  useThemeTokens: () => STOREFRONT_PRESETS[mockPreset as keyof typeof STOREFRONT_PRESETS],
}));

import { Lookbook } from "./Lookbook";

const product: CatalogProduct = {
  _id: "prod-a",
  name: "Camisa Teste",
  priceRetail: 100,
  variants: [{ _id: "v1", sku: "SKU-1", price: 100 }],
};

describe("Lookbook — Loop 22 asymmetric composition", () => {
  beforeEach(() => {
    mockPreset = "essencial";
    mockLookbook = { title: "Look pronto", imageUrl: "https://cdn.example.com/look.jpg", variantIds: ["v1"] };
  });
  afterEach(cleanup);

  it("AC2: essencial (uniform) keeps the historical 50/50 framed layout — regression zero", () => {
    mockPreset = "essencial";
    const { container } = render(<Lookbook items={[product]} role="guest" />);
    const section = container.querySelector("section") as HTMLElement;
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(section.className).toContain("rounded-xl");
    expect(section.className).toContain("border");
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).not.toContain("sm:grid-cols-5");
  });

  it("AC2: boutique (also editorial family, but gridComposition stays uniform/default) also keeps the 50/50 framed layout", () => {
    mockPreset = "boutique";
    const { container } = render(<Lookbook items={[product]} role="guest" />);
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.className).toContain("sm:grid-cols-2");
  });

  it("AC1: editorial (asymmetric) drops the frame and gives the photo more columns than the text panel", () => {
    mockPreset = "editorial";
    const { container } = render(<Lookbook items={[product]} role="guest" />);
    const section = container.querySelector("section") as HTMLElement;
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(section.className).not.toContain("rounded-xl");
    expect(section.className).not.toContain("border");
    expect(grid.className).toContain("sm:grid-cols-5");
    const photoCol = grid.children[0] as HTMLElement;
    const textCol = grid.children[1] as HTMLElement;
    expect(photoCol.className).toContain("sm:col-span-3");
    expect(textCol.className).toContain("sm:col-span-2");
  });
});
