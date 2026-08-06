import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { deriveCategoryTiles, CategoryTiles } from "./CategoryTiles";
import type { CatalogProduct } from "./ProductGrid";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/loja",
}));

vi.mock("@/stores/useCatalogStore", () => ({
  useCatalogStore: () => ({ category: "", setFilter: vi.fn() }),
}));

const shirt: CatalogProduct = { name: "Camisa", category: "Camisas", images: ["a.jpg"] };
const shirt2: CatalogProduct = { name: "Camisa 2", category: "Camisas", images: ["b.jpg"] };
const shorts: CatalogProduct = { name: "Bermuda", category: "Bermudas", images: ["c.jpg"] };
const noCategory: CatalogProduct = { name: "Sem categoria", images: ["d.jpg"] };

describe("deriveCategoryTiles (Loop 24 — Essencial/Renner)", () => {
  it("AC4: one tile per category, first photo found, no duplicates", () => {
    const tiles = deriveCategoryTiles([shirt, shirt2, shorts]);
    expect(tiles).toEqual([
      { category: "Camisas", imageUrl: "a.jpg" },
      { category: "Bermudas", imageUrl: "c.jpg" },
    ]);
  });

  it("ignores products without a category", () => {
    expect(deriveCategoryTiles([noCategory])).toEqual([]);
  });

  it("returns an empty list for an empty catalog", () => {
    expect(deriveCategoryTiles([])).toEqual([]);
  });
});

describe("CategoryTiles component", () => {
  afterEach(cleanup);

  it("renders nothing when there are no categories to show", () => {
    const { container } = render(<CategoryTiles items={[noCategory]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one tile per category, capped at 6", () => {
    const many: CatalogProduct[] = Array.from({ length: 8 }, (_, i) => ({
      name: `Produto ${i}`,
      category: `Categoria ${i}`,
      images: [`${i}.jpg`],
    }));
    render(<CategoryTiles items={many} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });
});
