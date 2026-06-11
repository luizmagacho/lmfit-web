"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { PriceTag } from "@/components/atoms/PriceTag";
import { resolvePrimaryImageUrl, resolveProductImageUrls } from "@/lib/productImageUrl";
import { documentId } from "@/lib/normalizeApiList";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";
import { ImageCarousel } from "@/components/ImageCarousel";

export type CatalogProduct = Record<string, unknown> & {
  name?: string;
  slug?: string;
  price?: number;
  priceRetail?: number;
  priceWholesale?: number;
  minWholesaleQty?: number;
  compareAtPrice?: number;
  createdAt?: string;
  category?: string;
  variants?: Array<Record<string, unknown>>;
};

const NEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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

function productIsNew(p: CatalogProduct): boolean {
  if (!p.createdAt) return false;
  const t = Date.parse(p.createdAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= NEW_WINDOW_MS;
}

function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

function retailPrice(p: CatalogProduct): number {
  if (p.priceRetail !== undefined && p.priceRetail !== null) return extractPrice(p.priceRetail);
  if (p.price !== undefined && p.price !== null) return extractPrice(p.price);
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    const v = p.variants[0] as { price?: unknown };
    if (v && v.price !== undefined && v.price !== null) return extractPrice(v.price);
  }
  return 0;
}

export function ProductGrid({
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
    const result = items.filter((p) => {
      if (onlyInStock && !productInStock(p)) return false;
      if (onlyNew && !productIsNew(p)) return false;
      if (!q) return true;
      const hay = [p.name, p.sku, p.category].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    // Coloca peças com estoque primeiro
    result.sort((a, b) => {
      const aStock = productInStock(a);
      const bStock = productInStock(b);
      if (aStock && !bStock) return -1;
      if (!aStock && bStock) return 1;
      return 0;
    });
    return result;
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
        const compareAt = typeof p.compareAtPrice === "number" ? p.compareAtPrice : null;
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
                  <PriceTag price={price} compareAt={compareAt} mode={mode} />
                </div>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
