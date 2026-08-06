"use client";

import * as React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { publicHttp } from "@/lib/publicHttp";
import { extractListItems, documentId } from "@/lib/normalizeApiList";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { PriceTag } from "@/components/atoms/PriceTag";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import { ImageCarousel } from "@/components/ImageCarousel";
import { retailPrice, variantPriceRange, type CatalogProduct } from "@/components/organisms/ProductGrid";
import { lmfitTokens } from "@/theme/tokens";

const MAX_ITEMS = 8;

/**
 * "Você também pode gostar" (Loop 5) — mesma categoria, exclui o produto atual. Busca a própria
 * página filtrada por categoria em vez de reaproveitar o grid principal: a PDP não tem acesso ao
 * estado do catálogo (`CatalogoClient`), são árvores de componentes diferentes.
 */
export function RelatedProducts({
  productId,
  category,
  role,
}: {
  productId: string;
  category: string;
  role: CustomerRole;
}) {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const mode = inferModeForUser(role);

  useEffect(() => {
    if (!category) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicHttp.get<unknown>("/public/catalog/products", {
          params: { category, limit: MAX_ITEMS + 1 },
        });
        const list = extractListItems(data) as CatalogProduct[];
        if (!cancelled) setItems(list.filter((p) => documentId(p) !== productId).slice(0, MAX_ITEMS));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, productId]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-2 border-t pt-6" style={{ borderColor: lmfitTokens.border }}>
      <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}>
        Você também pode gostar
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((p) => {
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
