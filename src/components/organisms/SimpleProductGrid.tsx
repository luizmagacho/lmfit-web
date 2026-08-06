"use client";

import * as React from "react";
import Link from "next/link";
import { useMemo } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { PriceTag } from "@/components/atoms/PriceTag";
import { ImageCarousel } from "@/components/ImageCarousel";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { documentId } from "@/lib/normalizeApiList";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";
import { productIsNew, retailPrice, type CatalogProduct } from "@/components/organisms/ProductGrid";

function productInStock(p: CatalogProduct): boolean {
  if (Array.isArray(p.variants)) {
    return p.variants.some((v) => {
      const r = v as { quantityOnHand?: number; quantityInStock?: number };
      const qty = typeof r.quantityOnHand === "number" ? r.quantityOnHand : r.quantityInStock;
      return typeof qty === "number" && qty > 0;
    });
  }
  const qty = (p as { quantityInStock?: number }).quantityInStock;
  return typeof qty === "number" && qty > 0;
}

/**
 * Grid simples do /catalogo (utilidade de atacado, compartilhável via WhatsApp) — igual ao
 * `ProductGrid` de antes do Loop 1 (sem swatches de cor, foto no hover ou badge de desconto):
 * foto única, nome, preço e badges de lançamento/esgotado. `ProductGrid.tsx` (v2, com toda a
 * evolução do e-commerce) fica exclusivo do /loja.
 */
export function SimpleProductGrid({
  items,
  loading,
  role,
}: {
  items: CatalogProduct[];
  loading?: boolean;
  role: CustomerRole;
}) {
  const { search, onlyInStock, onlyNew } = useCatalogStore();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (onlyInStock && !productInStock(p)) return false;
      if (onlyNew && !productIsNew(p)) return false;
      if (!q) return true;
      const hay = [p.name, p.sku, p.category].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, onlyInStock, onlyNew]);

  const mode = inferModeForUser(role);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <article
            key={i}
            className="rounded-lg border bg-[var(--card-bg)] overflow-hidden"
            style={{ borderColor: lmfitTokens.border }}
          >
            <Skeleton className="w-full" style={{ aspectRatio: "1 / 1" }} />
            <div className="p-2 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div
        className="rounded-lg border bg-[var(--card-bg)] p-6 text-center text-sm"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
      >
        Nenhum produto encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {filtered.map((p) => {
        const id = documentId(p) || String(p.slug ?? "");
        const slug = p.slug ? String(p.slug) : id;
        const urls = resolveProductImageUrls(p);
        const price = retailPrice(p);
        const isNew = productIsNew(p);
        const inStock = productInStock(p);
        return (
          <Link
            href={`/catalogo/p/${slug}`}
            key={id || String(p.name)}
            className="rounded-lg border bg-[var(--card-bg)] overflow-hidden flex flex-col hover:border-[var(--primary)] transition-colors active:scale-[0.98]"
            style={{ borderColor: lmfitTokens.border }}
          >
            <article className="flex flex-col h-full">
              <div className="relative w-full bg-neutral-100" style={{ aspectRatio: "1 / 1" }}>
                {urls.length > 0 ? (
                  <ImageCarousel urls={urls} size="fill" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400" aria-hidden>
                    Sem foto
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {isNew ? <Badge variant="lancamento" size="xs">Lançamento</Badge> : null}
                  {!inStock ? <Badge variant="estornado" size="xs">Esgotado</Badge> : null}
                </div>
              </div>
              <div className="p-2 space-y-1.5 flex-1 flex flex-col">
                <h3
                  className="text-sm font-medium line-clamp-2"
                  style={{ color: lmfitTokens.text }}
                  title={String(p.name ?? "")}
                >
                  {String(p.name ?? "Produto")}
                </h3>
                <div className="mt-auto">
                  <PriceTag price={price} mode={mode} />
                </div>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
