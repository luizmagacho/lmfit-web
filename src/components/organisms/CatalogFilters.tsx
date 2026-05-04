"use client";

import { useCatalogStore } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";
import { Search } from "lucide-react";

export function CatalogFilters() {
  const { search, onlyInStock, onlyNew, setFilter } = useCatalogStore();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-48">
        <Search
          size={16}
          className="absolute left-2 top-1/2 -translate-y-1/2"
          style={{ color: lmfitTokens.textMuted }}
          aria-hidden
        />
        <input
          type="search"
          inputMode="search"
          placeholder="Buscar produto…"
          className="w-full min-h-10 border rounded-md pl-7 pr-3 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
      </div>
      <label className="inline-flex items-center gap-2 min-h-10 px-3 text-sm rounded-md border bg-[var(--card-bg)]"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
        <input
          type="checkbox"
          checked={onlyInStock}
          onChange={(e) => setFilter({ onlyInStock: e.target.checked })}
          className="accent-lmfit-primary"
        />
        Estoque disponível
      </label>
      <label className="inline-flex items-center gap-2 min-h-10 px-3 text-sm rounded-md border bg-[var(--card-bg)]"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}>
        <input
          type="checkbox"
          checked={onlyNew}
          onChange={(e) => setFilter({ onlyNew: e.target.checked })}
          className="accent-lmfit-primary"
        />
        Lançamentos
      </label>
    </div>
  );
}
