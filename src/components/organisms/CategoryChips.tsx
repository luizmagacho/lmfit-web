"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { publicHttp } from "@/lib/publicHttp";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";

/** Loop 12 — barra de categorias em chips (família classic, padrão Renner). Lê o endpoint público
 *  já existente e escreve no MESMO filtro server-side que a PLP do Loop 5 já usa — clicar num chip
 *  é exatamente o mesmo que filtrar por categoria no rail de filtros. */
export function CategoryChips() {
  const router = useRouter();
  const pathname = usePathname();
  const { category, setFilter } = useCatalogStore();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicHttp.get<unknown>("/public/catalog/categories");
        const list = Array.isArray(data)
          ? data
              .map((c) => (typeof c === "string" ? c : String((c as { name?: unknown })?.name ?? "")))
              .filter(Boolean)
          : [];
        if (!cancelled) setCategories(list);
      } catch {
        // Sem categorias o bloco simplesmente não renderiza — nunca quebra o header.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (categories.length === 0) return null;

  function pick(next: string) {
    setFilter({ category: next === category ? "" : next });
    if (pathname !== "/loja") router.push("/loja");
  }

  return (
    <nav aria-label="Categorias" className="flex gap-2 overflow-x-auto py-2 px-4 max-w-3xl mx-auto">
      {categories.map((c) => {
        const active = c === category;
        return (
          <button
            key={c}
            type="button"
            onClick={() => pick(c)}
            className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors"
            style={{
              borderColor: active ? lmfitTokens.primary : lmfitTokens.border,
              color: active ? "#fff" : lmfitTokens.text,
              backgroundColor: active ? lmfitTokens.primary : "transparent",
            }}
          >
            {c}
          </button>
        );
      })}
    </nav>
  );
}
