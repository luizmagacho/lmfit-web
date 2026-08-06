"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useTenant, useThemeTokens } from "@/context/TenantContext";
import { useCartStore } from "@/stores/useCartStore";
import { documentId } from "@/lib/normalizeApiList";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { PriceTag } from "@/components/atoms/PriceTag";
import { Button } from "@/components/atoms/Button";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import type { CatalogProduct } from "@/components/organisms/ProductGrid";
import { lmfitTokens } from "@/theme/tokens";

function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export type LookbookItem = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  color?: string;
  size?: string;
  priceRetail: number;
  priceWholesale: number | null;
  minWholesaleQty: number;
  imageUrl: string | null;
  category?: string;
};

/**
 * Cruza `variantIds` (ids brutos guardados na config do tenant) com o catálogo já carregado
 * (`items`, com `variants[]` embutido) pra montar as linhas completas do look — evita bater um
 * endpoint novo só pra resolver nome/preço/imagem de cada peça.
 */
export function resolveLookbookItems(items: CatalogProduct[], variantIds: string[]): LookbookItem[] {
  if (variantIds.length === 0) return [];
  const wanted = new Set(variantIds);
  const out: LookbookItem[] = [];
  for (const p of items) {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    for (const raw of variants) {
      const v = raw as Record<string, unknown>;
      const vid = documentId(v);
      if (!vid || !wanted.has(vid)) continue;
      const retail = extractPrice(v.price ?? v.priceRetail ?? p.priceRetail ?? p.price);
      const wholesaleRaw = v.priceWholesale ?? v.wholesalePrice ?? p.priceWholesale;
      const wholesale =
        wholesaleRaw === undefined || wholesaleRaw === null || wholesaleRaw === "" ? null : extractPrice(wholesaleRaw);
      const minQty = typeof v.minWholesaleQty === "number" ? v.minWholesaleQty : (p.minWholesaleQty ?? 1);
      out.push({
        variantId: vid,
        productId: documentId(p),
        productName: String(p.name ?? "Produto"),
        sku: String(v.sku ?? vid),
        color: typeof v.color === "string" ? v.color : undefined,
        size: typeof v.size === "string" ? v.size : undefined,
        priceRetail: retail,
        priceWholesale: wholesale,
        minWholesaleQty: Math.max(1, Math.floor(minQty)),
        imageUrl: resolvePrimaryImageUrl(p),
        category: typeof p.category === "string" ? p.category : undefined,
      });
    }
  }
  return out;
}

/**
 * Vitrine editorial de look pronto (Loop 4 continuação). A config do tenant só guarda
 * `variantIds: string[]` — os dados completos de cada peça (nome, preço, imagem) vêm do mesmo
 * `items` já buscado pelo catálogo, cruzando por id em vez de bater outro endpoint.
 */
export function Lookbook({ items, role }: { items: CatalogProduct[]; role: CustomerRole }) {
  const { tenant } = useTenant();
  const { buttonStyle, gridComposition } = useThemeTokens();
  const cart = useCartStore();
  const [added, setAdded] = useState(false);
  const lookbook = tenant?.storefront?.lookbook;

  const resolved = useMemo<LookbookItem[]>(
    () => resolveLookbookItems(items, lookbook?.variantIds ?? []),
    [items, lookbook],
  );

  const mode = inferModeForUser(role);

  if (!lookbook || !lookbook.imageUrl || resolved.length === 0) return null;

  // Loop 22 — reaproveita o token já real do Loop 19 (hoje só Editorial) em vez de inventar um
  // novo pra essa distinção única, mesmo padrão do `isSticker`/`isIndustrial` dos Loops 20/21: a
  // foto domina o painel de texto (3/5 vs 2/5, não 50/50) e perde moldura/arredondamento —
  // "editorial" de verdade, não "catálogo". Qualquer outro preset (incluindo Boutique) continua
  // com a divisão 50/50 emoldurada de sempre (AC2, regressão zero).
  const isAsymmetric = gridComposition === "asymmetric";

  function handleAddAll() {
    for (const item of resolved) {
      cart.addOrIncrement(
        {
          variantId: item.variantId,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          color: item.color,
          size: item.size,
          priceRetail: item.priceRetail,
          priceWholesale: item.priceWholesale,
          minWholesaleQty: item.minWholesaleQty,
          imageUrl: item.imageUrl,
          category: item.category,
        },
        1,
      );
    }
    setAdded(true);
    cart.open();
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <section
      className={isAsymmetric ? "overflow-hidden" : "rounded-xl border overflow-hidden"}
      style={isAsymmetric ? undefined : { borderColor: lmfitTokens.border }}
    >
      <div className={isAsymmetric ? "grid sm:grid-cols-5" : "grid sm:grid-cols-2"}>
        <div
          className={`relative w-full bg-neutral-100 ${isAsymmetric ? "sm:col-span-3" : ""}`}
          style={{ aspectRatio: "4 / 5" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lookbook.imageUrl} alt={lookbook.title} className="w-full h-full object-cover" />
        </div>
        <div className={`p-4 space-y-3 flex flex-col ${isAsymmetric ? "sm:col-span-2" : ""}`}>
          <div>
            <span className="text-xs uppercase tracking-wide" style={{ color: lmfitTokens.textMuted }}>
              Look pronto
            </span>
            <h2 className="text-xl font-semibold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}>
              {lookbook.title}
            </h2>
          </div>
          <ul className="space-y-2 flex-1">
            {resolved.map((item) => (
              <li key={item.variantId} className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded-md bg-neutral-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <span className="flex-1 line-clamp-1" style={{ color: lmfitTokens.text }}>
                  {item.productName}
                  {item.color ? ` · ${item.color}` : ""}
                  {item.size ? ` · ${item.size}` : ""}
                </span>
                <PriceTag price={mode === "atacado" ? (item.priceWholesale ?? item.priceRetail) : item.priceRetail} mode={mode} />
              </li>
            ))}
          </ul>
          <Button
            variant={buttonStyle}
            onClick={handleAddAll}
            className="w-full"
            style={{ opacity: added ? 0.7 : 1 }}
          >
            {added ? "Adicionado ao carrinho" : "Adicionar look inteiro ao carrinho"}
          </Button>
        </div>
      </div>
    </section>
  );
}
