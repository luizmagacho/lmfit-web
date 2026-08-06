"use client";

import { create } from "zustand";
import { getLocallyReservedQtyByVariant, getOutboxCounts } from "@/lib/pdv/outbox";

type Product = Record<string, unknown>;

export type PdvSyncStatus = {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  lastError?: string;
};

type PdvState = {
  search: string;
  setSearch: (v: string) => void;
  activeProduct: Product | null;
  setActiveProduct: (p: Product | null) => void;
  focusVariantId: string | null;
  setFocusVariantId: (id: string | null) => void;
  /** Quantidade por variante ainda presa na fila local (vendas pendentes/em sincronização) —
   *  recalculada a partir da fila real (`outbox`) sempre que chamada, nunca um contador
   *  mantido à mão: correta por construção, ao contrário do scaffold antigo
   *  (`localReserved`/`reserve()`/`release()`) que dependia de alguém chamar reserve/release
   *  certinho e nunca era de fato usado em lugar nenhum. */
  getLocallyReservedQty: (variantId: string) => Promise<number>;
  /** Snapshot do estado da fila de sincronização, para o indicador de status no PDV. A fila
   *  vive no IndexedDB (sem reatividade nativa do React) — `refreshSyncStatus()` é a ponte:
   *  chamado sob demanda (montagem do badge, ou toda vez que `syncEngine` termina um flush). */
  syncStatus: PdvSyncStatus;
  refreshSyncStatus: () => Promise<void>;
};

export const usePdvStore = create<PdvState>((set) => ({
  search: "",
  setSearch: (v) => set({ search: v }),
  activeProduct: null,
  setActiveProduct: (p) => set({ activeProduct: p }),
  focusVariantId: null,
  setFocusVariantId: (id) => set({ focusVariantId: id }),
  getLocallyReservedQty: async (variantId) => {
    const totals = await getLocallyReservedQtyByVariant();
    return totals[variantId] ?? 0;
  },
  syncStatus: { pendingCount: 0, syncingCount: 0, failedCount: 0 },
  refreshSyncStatus: async () => {
    const syncStatus = await getOutboxCounts();
    set({ syncStatus });
  },
}));
