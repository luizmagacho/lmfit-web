"use client";

import { useEffect, useState } from "react";
import { publicHttp } from "@/lib/publicHttp";
import { extractListItems } from "@/lib/normalizeApiList";
import { CatalogFilters } from "@/components/organisms/CatalogFilters";
import { ProductGrid, type CatalogProduct } from "@/components/organisms/ProductGrid";
import { useAuthStore } from "@/stores/useAuthStore";
import { lmfitTokens } from "@/theme/tokens";

export function CatalogoClient() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const role = useAuthStore((s) => s.inferredRole());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await publicHttp.get<unknown>("/public/catalog/products");
        const list = extractListItems(data) as CatalogProduct[];
        if (!cancelled) {
          setItems(list.length ? list : (Array.isArray(data) ? (data as CatalogProduct[]) : []));
          setErr(null);
        }
      } catch {
        if (!cancelled) setErr("Não foi possível carregar o catálogo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
          Catálogo LM FIT
        </h1>
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          {role === "wholesaler" || role === "staff"
            ? "Você está vendo preços de atacado."
            : "Compre a partir de R$ para levar no atacado; filtros e estoque em tempo real."}
        </p>
      </header>
      <CatalogFilters />
      {err ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      ) : null}
      <ProductGrid items={items} loading={loading} role={role} />
    </div>
  );
}
