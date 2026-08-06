"use client";

import * as React from "react";
import Link from "next/link";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { documentId } from "@/lib/normalizeApiList";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/context/TenantContext";
import { retailPrice, type CatalogProduct } from "@/components/organisms/ProductGrid";

/** Loop 12 — rail horizontal de produtos (wireframes editorial/atlético: "scroll horizontal" de
 *  lançamentos). Card compacto próprio — deliberadamente mais simples que o card completo da PLP
 *  (sem swatches/badges/hover-swap), porque o rail é vitrine de descoberta, não grid de compra. */
export function ProductRail({ items, title }: { items: CatalogProduct[]; title?: string }) {
  const { cardAspectRatio } = useThemeTokens();
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      {title ? (
        <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
          {title}
        </h2>
      ) : null}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {items.map((p) => {
          const id = documentId(p) || String(p.slug ?? p.name ?? "");
          const slug = p.slug ? String(p.slug) : id;
          const url = resolveProductImageUrls(p)[0];
          return (
            <Link
              key={id}
              href={`/loja/p/${slug}`}
              className="flex-shrink-0 w-40 sm:w-48 snap-start group"
            >
              <div
                className="relative w-full bg-neutral-100 rounded-lg overflow-hidden"
                style={{ aspectRatio: cardAspectRatio }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={String(p.name ?? "")}
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                    style={{
                      transitionDuration: "var(--kivoni-storefront-motion-duration)",
                      transitionTimingFunction: "var(--kivoni-storefront-motion-easing)",
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400" aria-hidden>
                    Sem foto
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-sm line-clamp-1" style={{ color: lmfitTokens.text }}>
                {String(p.name ?? "Produto")}
              </p>
              <p className="text-sm font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>
                {formatBRL(retailPrice(p))}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
