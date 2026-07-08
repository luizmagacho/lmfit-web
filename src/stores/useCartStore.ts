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
  isOrder?: boolean;
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
  addOrIncrement: (line: Omit<CartLine, "quantity" | "unitPrice" | "mode">, qty: number, isOrder?: boolean) => void;
  setQuantity: (variantId: string, qty: number, isOrder?: boolean) => void;
  increment: (variantId: string, delta: number, isOrder?: boolean) => void;
  remove: (variantId: string, isOrder?: boolean) => void;
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

  addOrIncrement: (line, qty, isOrder) =>
    set((s) => {
      const q = Math.max(1, Math.floor(qty || 1));
      const existing = s.lines.find((l) => l.variantId === line.variantId && l.isOrder === isOrder);
      let next: CartLine[];
      if (existing) {
        next = s.lines.map((l) =>
          l.variantId === line.variantId && l.isOrder === isOrder ? { ...l, quantity: l.quantity + q } : l,
        );
      } else {
        next = [
          ...s.lines,
          { ...line, quantity: q, unitPrice: line.priceRetail, mode: "varejo", isOrder },
        ];
      }
      return { lines: recalc(next, s.role) };
    }),

  setQuantity: (variantId, qty, isOrder) =>
    set((s) => {
      if (qty <= 0) {
        return {
          lines: recalc(
            s.lines.filter((l) => !(l.variantId === variantId && l.isOrder === isOrder)),
            s.role,
          ),
        };
      }
      return {
        lines: recalc(
          s.lines.map((l) =>
            l.variantId === variantId && l.isOrder === isOrder ? { ...l, quantity: qty } : l,
          ),
          s.role,
        ),
      };
    }),

  increment: (variantId, delta, isOrder) =>
    set((s) => {
      let remove = false;
      const next = s.lines.map((l) => {
        if (l.variantId === variantId && l.isOrder === isOrder) {
          const q = l.quantity + delta;
          if (q <= 0) remove = true;
          return { ...l, quantity: q };
        }
        return l;
      });
      if (remove) {
        return {
          lines: recalc(
            next.filter((l) => l.quantity > 0),
            s.role,
          ),
        };
      }
      return { lines: recalc(next, s.role) };
    }),

  remove: (variantId, isOrder) =>
    set((s) => ({
      lines: recalc(
        s.lines.filter((l) => !(l.variantId === variantId && l.isOrder === isOrder)),
        s.role,
      ),
    })),

  clear: () => set({ lines: [], customer: null }),

  snapshot: () => {
    const { lines, customer, role } = get();
    const { items, subtotal } = totals(lines);
    return { lines, customer, role, items, subtotal };
  },
}));
