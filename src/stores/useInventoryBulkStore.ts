"use client";

import { create } from "zustand";

export type BulkChange = {
  /** Percentual a aplicar sobre o preço (ex.: +10 = +10%, -5 = -5%). */
  pricePercent?: number;
  /** Preço fixo a aplicar. */
  priceSet?: number;
  /** Quantidade em estoque a aplicar (substitui o valor atual). */
  quantityInStockSet?: number;
  /** Ajuste somado ao estoque (pode ser negativo). */
  quantityInStockDelta?: number;
};

type BulkState = {
  selected: Record<string, true>;
  lastApplied: BulkChange | null;
  toggle: (id: string) => void;
  setMany: (ids: string[], value: boolean) => void;
  clear: () => void;
  selectedIds: () => string[];
  setLastApplied: (c: BulkChange | null) => void;
};

export const useInventoryBulkStore = create<BulkState>((set, get) => ({
  selected: {},
  lastApplied: null,
  toggle: (id) =>
    set((s) => {
      const next = { ...s.selected };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { selected: next };
    }),
  setMany: (ids, value) =>
    set((s) => {
      const next = { ...s.selected };
      for (const id of ids) {
        if (value) next[id] = true;
        else delete next[id];
      }
      return { selected: next };
    }),
  clear: () => set({ selected: {} }),
  selectedIds: () => Object.keys(get().selected),
  setLastApplied: (c) => set({ lastApplied: c }),
}));

export function applyBulkChange(row: { price?: number; quantityInStock?: number }, c: BulkChange) {
  const next = { ...row };
  if (typeof c.priceSet === "number" && Number.isFinite(c.priceSet)) {
    next.price = Math.max(0, c.priceSet);
  } else if (typeof c.pricePercent === "number" && Number.isFinite(c.pricePercent)) {
    const base = typeof row.price === "number" ? row.price : 0;
    next.price = Math.max(0, Number((base * (1 + c.pricePercent / 100)).toFixed(2)));
  }
  if (typeof c.quantityInStockSet === "number" && Number.isFinite(c.quantityInStockSet)) {
    next.quantityInStock = Math.max(0, Math.floor(c.quantityInStockSet));
  } else if (typeof c.quantityInStockDelta === "number" && Number.isFinite(c.quantityInStockDelta)) {
    const base = typeof row.quantityInStock === "number" ? row.quantityInStock : 0;
    next.quantityInStock = Math.max(0, Math.floor(base + c.quantityInStockDelta));
  }
  return next;
}
