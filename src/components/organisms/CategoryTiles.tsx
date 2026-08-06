"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";
import type { CatalogProduct } from "./ProductGrid";

export type CategoryTile = { category: string; imageUrl: string | null };

/** Deriva um tile por categoria (primeira foto encontrada, ordem de primeira aparição) a partir
 *  do catálogo já carregado — sem endpoint novo. Loop 24 (Essencial/Renner: "tiles de categoria
 *  COM FOTO", hoje só existiam como chips de texto no header, compartilhados por toda a família
 *  classic). */
export function deriveCategoryTiles(items: CatalogProduct[]): CategoryTile[] {
  const byCategory = new Map<string, string | null>();
  for (const p of items) {
    const category = typeof p.category === "string" ? p.category.trim() : "";
    if (!category || byCategory.has(category)) continue;
    byCategory.set(category, resolvePrimaryImageUrl(p));
  }
  return [...byCategory.entries()].map(([category, imageUrl]) => ({ category, imageUrl }));
}

/** Grade de categorias com foto (Loop 24, Essencial/Renner) — clicar filtra o catálogo pelo mesmo
 *  mecanismo que `CategoryChips` já usa (`setFilter`, sem endpoint novo). Deriva do catálogo já
 *  carregado em vez de bater `/public/catalog/categories` de novo (esse endpoint só devolve nomes,
 *  sem foto — cruzar com o catálogo já em mãos é o jeito de ter foto sem mudar o backend). */
export function CategoryTiles({ items }: { items: CatalogProduct[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { category, setFilter } = useCatalogStore();
  const tiles = deriveCategoryTiles(items).slice(0, 6);

  if (tiles.length === 0) return null;

  function pick(next: string) {
    setFilter({ category: next === category ? "" : next });
    if (pathname !== "/loja") router.push("/loja");
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {tiles.map((t) => {
        const active = t.category === category;
        return (
          <button
            key={t.category}
            type="button"
            onClick={() => pick(t.category)}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <div
              className="relative w-full rounded-lg overflow-hidden bg-neutral-100 border-2"
              style={{ aspectRatio: "1 / 1", borderColor: active ? lmfitTokens.primary : "transparent" }}
            >
              {t.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <span className="text-xs font-medium line-clamp-1" style={{ color: lmfitTokens.text }}>
              {t.category}
            </span>
          </button>
        );
      })}
    </div>
  );
}
