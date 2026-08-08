import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/publicHttp", () => ({
  publicHttp: {
    get: vi.fn().mockResolvedValue({
      data: {
        categories: ["Camisetas", "Calças", "Casacos"],
        sizes: ["P", "M", "G"],
        colors: Array.from({ length: 34 }, (_, i) => `Cor ${i + 1}`),
        priceMin: 0,
        priceMax: 500,
      },
    }),
  },
}));

import { useCatalogStore } from "@/stores/useCatalogStore";
import { CatalogFilters } from "./CatalogFilters";

describe("CatalogFilters", () => {
  beforeEach(() => {
    useCatalogStore.getState().reset();
  });

  afterEach(cleanup);

  it("keeps the facets panel collapsed by default — the sprawl bug this fixes", async () => {
    render(<CatalogFilters />);
    await screen.findByRole("button", { name: /filtros/i });
    expect(screen.queryByText("Categoria")).toBeNull();
    expect(screen.queryByText("Cor 1")).toBeNull();
  });

  it("opens the facets panel on toggle and caps a 34-color list behind a 'mais' pill", async () => {
    render(<CatalogFilters />);
    const toggle = await screen.findByRole("button", { name: /filtros/i });
    fireEvent.click(toggle);

    expect(await screen.findByText("Categoria")).toBeDefined();
    expect(screen.getByText("Cor 1")).toBeDefined();
    expect(screen.queryByText("Cor 9")).toBeNull();
    const more = screen.getByText(/\+26 mais/);
    expect(more).toBeDefined();

    fireEvent.click(more);
    expect(screen.getByText("Cor 9")).toBeDefined();
    expect(screen.getByText("mostrar menos")).toBeDefined();
  });

  it("shows an active-filter count badge on the Filtros button once a facet is selected", async () => {
    render(<CatalogFilters />);
    const toggle = await screen.findByRole("button", { name: /filtros/i });
    fireEvent.click(toggle);

    fireEvent.click(await screen.findByText("Camisetas"));
    expect(screen.getByText("1")).toBeDefined();
  });

  it("keeps the active color visible even when its group is collapsed", async () => {
    useCatalogStore.getState().setFilter({ color: "Cor 30" });
    render(<CatalogFilters />);
    fireEvent.click(await screen.findByRole("button", { name: /filtros/i }));

    await screen.findByText("Cor 1");
    expect(screen.getByText("Cor 30")).toBeDefined();
  });
});
