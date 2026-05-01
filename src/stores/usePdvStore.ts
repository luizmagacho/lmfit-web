"use client";

import { create } from "zustand";

type Product = Record<string, unknown>;

type PdvState = {
  search: string;
  setSearch: (v: string) => void;
  activeProduct: Product | null;
  setActiveProduct: (p: Product | null) => void;
  focusVariantId: string | null;
  setFocusVariantId: (id: string | null) => void;
  /** Estoque reservado local (antes de enviar ao servidor) para evitar overselling na sessao. */
  localReserved: Record<string, number>;
  reserve: (variantId: string, qty: number) => void;
  release: (variantId: string, qty: number) => void;
  resetReservations: () => void;
};

export const usePdvStore = create<PdvState>((set) => ({
  search: "",
  setSearch: (v) => set({ search: v }),
  activeProduct: null,
  setActiveProduct: (p) => set({ activeProduct: p }),
  focusVariantId: null,
  setFocusVariantId: (id) => set({ focusVariantId: id }),
  localReserved: {},
  reserve: (variantId, qty) =>
    set((s) => ({
      localReserved: {
        ...s.localReserved,
        [variantId]: Math.max(0, (s.localReserved[variantId] ?? 0) + qty),
      },
    })),
  release: (variantId, qty) =>
    set((s) => ({
      localReserved: {
        ...s.localReserved,
        [variantId]: Math.max(0, (s.localReserved[variantId] ?? 0) - qty),
      },
    })),
  resetReservations: () => set({ localReserved: {} }),
}));
