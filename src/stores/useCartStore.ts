"use client";

import { create } from "zustand";
import type { CustomerRole, PriceMode } from "@/lib/pricing";
import { resolveUnitPrice } from "@/lib/pricing";

export type CartLine = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  color?: string;
  size?: string;
  quantity: number;
  priceRetail: number;
  priceWholesale: number | null;
  minWholesaleQty: number;
  unitPrice: number;
  mode: PriceMode;
  imageUrl?: string | null;
};

export type CartCustomer = {
  id?: string;
  name?: string;
  phone?: string;
};

export type CartSnapshot = {
  lines: CartLine[];
  customer: CartCustomer | null;
  role: CustomerRole;
  items: number;
  subtotal: number;
};

type CartState = {
  lines: CartLine[];
  customer: CartCustomer | null;
  role: CustomerRole;
  setRole: (r: CustomerRole) => void;
  setCustomer: (c: CartCustomer | null) => void;
  addOrIncrement: (line: Omit<CartLine, "quantity" | "unitPrice" | "mode">, qty: number) => void;
  setQuantity: (variantId: string, qty: number) => void;
  increment: (variantId: string, delta: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  snapshot: () => CartSnapshot;
};

function recalc(lines: CartLine[], role: CustomerRole): CartLine[] {
  return lines.map((l) => {
    const { price, mode } = resolveUnitPrice(
      {
        priceRetail: l.priceRetail,
        priceWholesale: l.priceWholesale,
        minWholesaleQty: l.minWholesaleQty,
      },
      l.quantity,
      role,
    );
    return { ...l, unitPrice: price, mode };
  });
}

function totals(lines: CartLine[]) {
  let items = 0;
  let subtotal = 0;
  for (const l of lines) {
    items += l.quantity;
    subtotal += l.unitPrice * l.quantity;
  }
  return { items, subtotal };
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  customer: null,
  role: "guest",

  setRole: (r) => set((s) => ({ role: r, lines: recalc(s.lines, r) })),
  setCustomer: (c) => set({ customer: c }),

  addOrIncrement: (line, qty) =>
    set((s) => {
      const q = Math.max(1, Math.floor(qty || 1));
      const existing = s.lines.find((l) => l.variantId === line.variantId);
      let next: CartLine[];
      if (existing) {
        next = s.lines.map((l) =>
          l.variantId === line.variantId ? { ...l, quantity: l.quantity + q } : l,
        );
      } else {
        next = [
          ...s.lines,
          { ...line, quantity: q, unitPrice: line.priceRetail, mode: "varejo" },
        ];
      }
      return { lines: recalc(next, s.role) };
    }),

  setQuantity: (variantId, qty) =>
    set((s) => {
      const q = Math.max(0, Math.floor(qty || 0));
      if (q === 0) return { lines: s.lines.filter((l) => l.variantId !== variantId) };
      const next = s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity: q } : l));
      return { lines: recalc(next, s.role) };
    }),

  increment: (variantId, delta) =>
    set((s) => {
      const next = s.lines
        .map((l) =>
          l.variantId === variantId
            ? { ...l, quantity: Math.max(0, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0);
      return { lines: recalc(next, s.role) };
    }),

  remove: (variantId) =>
    set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),

  clear: () => set({ lines: [], customer: null }),

  snapshot: () => {
    const { lines, customer, role } = get();
    const { items, subtotal } = totals(lines);
    return { lines, customer, role, items, subtotal };
  },
}));
