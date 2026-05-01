"use client";

import { create } from "zustand";

export type CatalogFilter = {
  onlyInStock: boolean;
  onlyNew: boolean;
  search: string;
  category: string;
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
};

export const useCatalogStore = create<CatalogState>((set) => ({
  ...INITIAL,
  setFilter: (f) => set((s) => ({ ...s, ...f })),
  reset: () => set({ ...INITIAL }),
}));
