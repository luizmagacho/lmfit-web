"use client";

import * as React from "react";
import Link from "next/link";
import { useMemo } from "react";
import { PriceTag } from "@/components/atoms/PriceTag";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { documentId } from "@/lib/normalizeApiList";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import { ImageCarousel } from "@/components/ImageCarousel";
import { productIsNew, retailPrice, variantPriceRange, type CatalogProduct } from "@/components/organisms/ProductGrid";
import { lmfitTokens } from "@/theme/tokens";

const MAX_ITEMS = 8;

/**
 * Vitrine "Lançamentos" (Loop 4 continuação) — reaproveita a mesma heurística de recência do
 * filtro "Lançamentos" do catálogo, mas fica fora do `useCatalogStore`: é uma vitrine editorial,
 * não deve sumir quando o comprador digita uma busca no filtro principal logo abaixo.
 */
export function NewArrivalsShelf({ items, role }: { items: CatalogProduct[]; role: CustomerRole }) {
  const newest = useMemo(() => items.filter(productIsNew).slice(0, MAX_ITEMS), [items]);
  const mode = inferModeForUser(role);

  if (newest.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}>
        Lançamentos
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {newest.map((p) => {
          const id = documentId(p) || String(p.slug ?? "");
          const slug = p.slug ? String(p.slug) : id;
          const urls = resolveProductImageUrls(p);
          const range = mode === "varejo" ? variantPriceRange(p) : null;
          const price = range ? range.min : retailPrice(p);
          const priceMax = range && range.max > range.min ? range.max : null;
          return (
            <Link
              href={`/loja/p/${slug}`}
              key={id || String(p.name)}
              className="flex-shrink-0 w-36 rounded-lg border bg-[var(--card-bg)] overflow-hidden hover:border-[var(--primary)] transition-colors"
              style={{ borderColor: lmfitTokens.border }}
            >
              <div className="relative w-full bg-neutral-100" style={{ aspectRatio: "1 / 1" }}>
                {urls.length > 0 ? (
                  <ImageCarousel urls={urls} size="fill" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400" aria-hidden>
                    Sem foto
                  </div>
                )}
              </div>
              <div className="p-2 space-y-1">
                <h3 className="text-xs font-medium line-clamp-2" style={{ color: lmfitTokens.text }}>
                  {String(p.name ?? "Produto")}
                </h3>
                <PriceTag price={price} priceMax={priceMax} mode={mode} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
