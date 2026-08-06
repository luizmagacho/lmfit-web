"use client";

import { create } from "zustand";
import { customerHttp } from "@/lib/customerHttp";
import { documentId } from "@/lib/normalizeApiList";
import type { CatalogProduct } from "@/components/organisms/ProductGrid";

type WishlistResponse = { items: CatalogProduct[] };

type WishlistState = {
  items: CatalogProduct[];
  ids: Set<string>;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  reset: () => void;
};

function idsFromItems(items: CatalogProduct[]): Set<string> {
  return new Set(items.map((p) => documentId(p)).filter(Boolean));
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  ids: new Set(),
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true, initialized: true });
    try {
      const { data } = await customerHttp.get<WishlistResponse>("/me/wishlist");
      set({ items: data.items, ids: idsFromItems(data.items), loading: false });
    } catch {
      set({ loading: false });
    }
  },

  isWishlisted: (productId: string) => get().ids.has(productId),

  toggle: async (productId: string) => {
    const already = get().ids.has(productId);
    try {
      const { data } = already
        ? await customerHttp.delete<WishlistResponse>(`/me/wishlist/${productId}`)
        : await customerHttp.post<WishlistResponse>("/me/wishlist", { productId });
      set({ items: data.items, ids: idsFromItems(data.items) });
    } catch {
      /* deixa o estado como estava — o botão volta ao ícone anterior */
    }
  },

  remove: async (productId: string) => {
    try {
      const { data } = await customerHttp.delete<WishlistResponse>(`/me/wishlist/${productId}`);
      set({ items: data.items, ids: idsFromItems(data.items) });
    } catch {
      /* ignore */
    }
  },

  reset: () => set({ items: [], ids: new Set(), initialized: false }),
}));
