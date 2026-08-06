"use client";

import { create } from "zustand";

export type PublicCatalogSort = "relevancia" | "menor-preco" | "maior-preco" | "lancamentos";

export type CatalogFilter = {
  /** Client-side only (filtered on the currently-loaded page, not sent to the server). */
  onlyInStock: boolean;
  onlyNew: boolean;
  search: string;
  /** Server-side filters (Loop 5) — changing any of these resets pagination to page 1. */
  category: string;
  size: string;
  color: string;
  priceMin: number | null;
  priceMax: number | null;
  sort: PublicCatalogSort;
};

type CatalogState = CatalogFilter & {
  setFilter: (f: Partial<CatalogFilter>) => void;
  reset: () => void;
};

const INITIAL: CatalogFilter = {
  onlyInStock: false,
  onlyNew: false,
  search: "",
  category: "",
  size: "",
  color: "",
  priceMin: null,
  priceMax: null,
  sort: "relevancia",
};

export const useCatalogStore = create<CatalogState>((set) => ({
  ...INITIAL,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  reset: () => set({ ...INITIAL }),
}));
