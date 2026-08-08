"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { publicHttp } from "@/lib/publicHttp";
import { useCatalogStore, type PublicCatalogSort } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";

type Facets = {
  categories: string[];
  colors: string[];
  sizes: string[];
  priceMin: number;
  priceMax: number;
};

const SORT_OPTIONS: { value: PublicCatalogSort; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "lancamentos", label: "Lançamentos" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
];

/** How many pills a facet shows before collapsing behind "mostrar mais" — a catalog with
 *  30+ colors used to dump every single one on screen at once with no cap at all. */
const MAX_VISIBLE_OPTIONS = 8;

function FacetGroup({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: string[];
  active: string;
  onSelect: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (options.length === 0) return null;

  // The active option must always be visible, even collapsed, so a selection never
  // disappears from under the user just because it wasn't among the first N alphabetically.
  const visible =
    expanded || options.length <= MAX_VISIBLE_OPTIONS
      ? options
      : active && options.includes(active) && options.indexOf(active) >= MAX_VISIBLE_OPTIONS
        ? [...options.slice(0, MAX_VISIBLE_OPTIONS - 1), active]
        : options.slice(0, MAX_VISIBLE_OPTIONS);
  const hiddenCount = options.length - visible.length;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((opt) => {
          const isActive = active === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onSelect(isActive ? "" : opt)}
              aria-pressed={isActive}
              className="min-h-8 px-3 rounded-full border text-xs font-medium transition-colors"
              style={{
                borderColor: isActive ? lmfitTokens.primary : lmfitTokens.border,
                backgroundColor: isActive ? lmfitTokens.primary : "var(--card-bg)",
                color: isActive ? "#fff" : lmfitTokens.text,
              }}
            >
              {opt}
            </button>
          );
        })}
        {options.length > MAX_VISIBLE_OPTIONS && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-h-8 px-3 rounded-full border text-xs font-medium transition-colors underline-offset-2 hover:underline"
            style={{ borderColor: "transparent", color: lmfitTokens.textMuted }}
          >
            {expanded ? "mostrar menos" : `+${hiddenCount} mais`}
          </button>
        )}
      </div>
    </div>
  );
}

export function CatalogFilters() {
  const {
    search,
    onlyInStock,
    onlyNew,
    category,
    size,
    color,
    priceMin,
    priceMax,
    sort,
    setFilter,
  } = useCatalogStore();
  const [facets, setFacets] = useState<Facets | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFacetCount = useMemo(
    () => [category, size, color].filter(Boolean).length + (priceMin != null ? 1 : 0) + (priceMax != null ? 1 : 0),
    [category, size, color, priceMin, priceMax],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicHttp.get<Facets>("/public/catalog/facets");
        if (!cancelled) setFacets(data);
      } catch {
        // Filtro por faceta some silenciosamente se isso falhar — busca/checkboxes continuam ok.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
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
        <label
          className="inline-flex items-center gap-2 min-h-10 px-3 text-sm rounded-md border bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setFilter({ onlyInStock: e.target.checked })}
            className="accent-lmfit-primary"
          />
          Estoque disponível
        </label>
        <label
          className="inline-flex items-center gap-2 min-h-10 px-3 text-sm rounded-md border bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(e) => setFilter({ onlyNew: e.target.checked })}
            className="accent-lmfit-primary"
          />
          Lançamentos
        </label>
        <select
          value={sort}
          onChange={(e) => setFilter({ sort: e.target.value as PublicCatalogSort })}
          className="min-h-10 px-3 rounded-md border text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          aria-label="Ordenar"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {facets ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="inline-flex items-center gap-1.5 min-h-10 px-3 text-sm rounded-md border bg-[var(--card-bg)]"
            style={{
              borderColor: filtersOpen || activeFacetCount > 0 ? lmfitTokens.primary : lmfitTokens.border,
              color: filtersOpen || activeFacetCount > 0 ? lmfitTokens.primary : lmfitTokens.text,
            }}
          >
            <SlidersHorizontal size={14} aria-hidden />
            Filtros
            {activeFacetCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: lmfitTokens.primary }}
              >
                {activeFacetCount}
              </span>
            )}
            <ChevronDown size={14} aria-hidden className={filtersOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        ) : null}
      </div>

      {facets && filtersOpen ? (
        <div className="flex flex-wrap gap-x-6 gap-y-3 p-3 rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
          <FacetGroup label="Categoria" options={facets.categories} active={category} onSelect={(v) => setFilter({ category: v })} />
          <FacetGroup label="Tamanho" options={facets.sizes} active={size} onSelect={(v) => setFilter({ size: v })} />
          <FacetGroup label="Cor" options={facets.colors} active={color} onSelect={(v) => setFilter({ color: v })} />
          <div className="space-y-1.5">
            <span className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
              Preço
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="decimal"
                placeholder={`R$ ${facets.priceMin}`}
                value={priceMin ?? ""}
                onChange={(e) => setFilter({ priceMin: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-20 min-h-8 px-2 rounded-md border text-xs bg-[var(--card-bg)]"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
              <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                –
              </span>
              <input
                type="number"
                inputMode="decimal"
                placeholder={`R$ ${facets.priceMax}`}
                value={priceMax ?? ""}
                onChange={(e) => setFilter({ priceMax: e.target.value === "" ? null : Number(e.target.value) })}
                className="w-20 min-h-8 px-2 rounded-md border text-xs bg-[var(--card-bg)]"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
