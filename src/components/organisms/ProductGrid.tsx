"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { PriceTag } from "@/components/atoms/PriceTag";
import { WishlistHeartButton } from "@/components/atoms/WishlistHeartButton";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { documentId } from "@/lib/normalizeApiList";
import { resolveSwatchColor } from "@/lib/colorSwatch";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { lmfitTokens } from "@/theme/tokens";
import { useThemeTokens } from "@/context/TenantContext";
import type { GridComposition } from "@/theme/storefrontPresets";

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

/** Exportada pra ser reaproveitada pela vitrine de Lançamentos (Loop 4 continuação) — mesma
 *  heurística de recência, sem duplicar a janela de 30 dias em dois lugares. */
export function productIsNew(p: CatalogProduct): boolean {
  if (!p.createdAt) return false;
  const t = Date.parse(p.createdAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= NEW_WINDOW_MS;
}

/** Loop 10 v2 — `sizes` real derivado das colunas do preset ativo, não um número fixo chutado.
 *  O container público é `max-w-3xl` (768px), então acima de `md:` (768px) o card nunca cresce
 *  além desse teto; abaixo disso o container ainda é mais estreito que a tela. */
export function buildCardImageSizes(plpColumns: { base: string; sm: string; md: string }): string {
  const colsOf = (cls: string) => {
    const m = cls.match(/grid-cols-(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  };
  const base = colsOf(plpColumns.base);
  const sm = colsOf(plpColumns.sm);
  const md = colsOf(plpColumns.md);
  return [
    `(min-width: 768px) ${Math.round(768 / md)}px`,
    `(min-width: 640px) ${Math.round(100 / sm)}vw`,
    `${Math.round(100 / base)}vw`,
  ].join(", ");
}

function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function retailPrice(p: CatalogProduct): number {
  if (p.priceRetail !== undefined && p.priceRetail !== null) return extractPrice(p.priceRetail);
  if (p.price !== undefined && p.price !== null) return extractPrice(p.price);
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    const v = p.variants[0] as { price?: unknown };
    if (v && v.price !== undefined && v.price !== null) return extractPrice(v.price);
  }
  return 0;
}

/** Cores distintas entre as variações — swatches do card v2 (Loop 5). */
function productColors(p: CatalogProduct): string[] {
  if (!Array.isArray(p.variants)) return [];
  const seen = new Set<string>();
  for (const raw of p.variants) {
    const c = (raw as { color?: unknown }).color;
    if (typeof c === "string" && c.trim()) seen.add(c.trim());
  }
  return [...seen];
}

/** Menor/maior preço entre as variações — o card mostra a faixa quando divergem. */
export function variantPriceRange(p: CatalogProduct): { min: number; max: number } | null {
  if (!Array.isArray(p.variants) || p.variants.length === 0) return null;
  const prices: number[] = [];
  for (const raw of p.variants) {
    const v = raw as { price?: unknown };
    if (v?.price === undefined || v.price === null || v.price === "") continue;
    const n = extractPrice(v.price);
    if (n > 0) prices.push(n);
  }
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Loop 19 — Tropical: um tile 2×2 a cada 6 itens (índice 0-based, primeiro item de cada ciclo).
 *  Mesmo `cardAspectRatio` do preset, só que o card ocupa o dobro de largura/altura de grade —
 *  a imagem cresce proporcionalmente (aspect-ratio não muda), o que já entrega o efeito de
 *  "featured tile" sem precisar de nenhuma imagem/asset diferente. */
export function isMosaicFeatureTile(index: number): boolean {
  return index % 6 === 0;
}

/** Loop 19 — Editorial: tile alargado (só largura, sem altura) a cada 5 itens — mais discreto que
 *  o mosaico do Tropical (intencional: "asymmetric" ≠ "mosaic"). */
export function isAsymmetricFeatureTile(index: number): boolean {
  return index % 5 === 0;
}

/** Loop 19 — Luxo: desloca itens em posição ímpar pra criar ritmo de alturas alternadas em 2
 *  colunas (masonry "pobre" via `translate-y`, sem precisar medir imagem via JS). */
export function isSparseDuoOffset(index: number): boolean {
  return index % 2 === 1;
}

/** Loop 19 — classe de span Tailwind pro item `index` sob a `composition` ativa. Só entra em
 *  `sm:` pra cima — abaixo disso a coluna costuma ser única/dupla e um span de 2 quebraria o
 *  layout mobile (ex.: `plpColumns.base` pode ser `grid-cols-1`). */
export function gridCompositionSpanClass(composition: GridComposition, index: number): string {
  if (composition === "mosaic" && isMosaicFeatureTile(index)) return "sm:col-span-2 sm:row-span-2";
  if (composition === "asymmetric" && isAsymmetricFeatureTile(index)) return "sm:col-span-2";
  return "";
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
  const { plpColumns, cardAspectRatio, plpGap, newBadgeLabel, cardFrame, gridComposition, layoutFamily } = useThemeTokens();
  // Loop 20 — só o Tropical (família expressive) ganha cara de adesivo nos badges; reaproveita o
  // token `layoutFamily` já real em vez de inventar um novo pra uma distinção de preset único.
  const isSticker = layoutFamily === "expressive";
  // Loop 21 — só o Streetwear (família industrial) ganha o selo numerado "Nº 000N", mesmo padrão
  // de gate por `layoutFamily` já estabelecido pelo `isSticker`.
  const isIndustrial = layoutFamily === "industrial";
  const gridColsClass = `${plpColumns.base} ${plpColumns.sm} ${plpColumns.md}`;
  // Loop 19 — `dense` deixa itens menores preencherem os buracos ao redor de um tile maior
  // (mosaico/asymmetric); sem isso o tile 2×2 deixaria um vão vazio ao lado. Só entra quando a
  // composição de fato usa spans variáveis — "uniform"/"sparse-duo" não precisam.
  const gridFlowClass =
    gridComposition === "mosaic" || gridComposition === "asymmetric" ? "grid-flow-row-dense" : "";
  // Loop 10 v2 — `sizes` real por preset: o container é `max-w-3xl` (768px), então md: usa esse
  // teto em vez de 100vw; base/sm ainda dividem o viewport porque o container é mais estreito que
  // a tela nesses breakpoints. Colunas extraídas dos próprios tokens, não um número fixo chutado.
  const cardImageSizes = buildCardImageSizes(plpColumns);
  const motionStyle: React.CSSProperties = {
    transitionDuration: "var(--kivoni-storefront-motion-duration)",
    transitionTimingFunction: "var(--kivoni-storefront-motion-easing)",
  };
  // Loop 12 — moldura do card por preset: "borderless" (Luxo/Minimal: foto solta no fundo, sem
  // caixa) e "hard-border" (Streetwear: borda preta dura 2px); "border" é o card de sempre.
  const frameClass =
    cardFrame === "borderless"
      ? "rounded-lg overflow-hidden"
      : cardFrame === "hard-border"
        ? "border-2 overflow-hidden bg-[var(--card-bg)]"
        : "rounded-lg border bg-[var(--card-bg)] overflow-hidden";
  const frameStyle: React.CSSProperties =
    cardFrame === "borderless" ? {} : { borderColor: lmfitTokens.border };

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
      <div className={`grid ${gridColsClass} ${plpGap}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <article key={i} className={frameClass} style={frameStyle}>
            <Skeleton className="w-full" style={{ aspectRatio: cardAspectRatio }} />
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
    <div className={`grid ${gridColsClass} ${plpGap} ${gridFlowClass}`}>
      {filtered.map((p, idx) => {
        const id = documentId(p) || String(p.slug ?? "");
        const slug = p.slug ? String(p.slug) : id;
        const urls = resolveProductImageUrls(p);
        // Consumidor vê preço de varejo por variação; faixa quando as variações divergem.
        const range = mode === "varejo" ? variantPriceRange(p) : null;
        const price = range ? range.min : retailPrice(p);
        const priceMax = range && range.max > range.min ? range.max : null;
        // `compareAtPrice` chega formatado como string BRL ("399,90") pelo interceptor global de
        // dinheiro (BrlMoneyResponseInterceptor) — precisa do mesmo parser usado pra price/etc.,
        // não um `typeof === "number"` (que nunca bate e sempre escondia o preço riscado/badge).
        const compareAtRaw = p.compareAtPrice as unknown;
        const compareAt =
          compareAtRaw !== undefined && compareAtRaw !== null && compareAtRaw !== ""
            ? extractPrice(compareAtRaw)
            : null;
        const isNew = productIsNew(p);
        const inStock = productInStock(p);
        const discountPct = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
        const colors = productColors(p);
        // Loop 19 — span do tile (mosaico/asymmetric) e deslocamento vertical (sparse-duo, Luxo)
        // por índice; "uniform" nunca produz classe extra, então os 5 presets default continuam
        // renderizando o card exatamente como antes deste loop (AC1). O deslocamento só entra em
        // `sm:` pra cima (classe Tailwind, não inline style) pelo mesmo motivo do span: em coluna
        // única (`plpColumns.base` do Luxo é `grid-cols-1`) um offset vertical quebraria o ritmo
        // de uma lista simples de 1 coluna.
        const spanClass = gridCompositionSpanClass(gridComposition, idx);
        const offsetClass =
          gridComposition === "sparse-duo" && isSparseDuoOffset(idx) ? "sm:translate-y-8" : "";
        return (
          <Link
            href={`/loja/p/${slug}`}
            key={id || String(p.name)}
            // Loop 20 — hover ganha `scale` de verdade (não só o crossfade de opacidade que já
            // existia), usando os MESMOS tokens de motion já computados em `motionStyle` — a
            // curva de cada preset decide o "feel"; só a do Tropical tem overshoot (bounce real).
            className={`group ${frameClass} ${spanClass} ${offsetClass} flex flex-col hover:border-[var(--primary)] hover:scale-[1.03] transition-all active:scale-[0.98]`}
            style={{ ...frameStyle, ...motionStyle }}
          >
            <article className="flex flex-col h-full">
              <div className="relative w-full bg-neutral-100" style={{ aspectRatio: cardAspectRatio }}>
                {urls.length > 0 ? (
                  <>
                    <Image
                      src={urls[0]}
                      alt={String(p.name ?? "")}
                      fill
                      sizes={cardImageSizes}
                      priority={idx === 0}
                      className="object-cover transition-opacity group-hover:opacity-0"
                      style={motionStyle}
                    />
                    {urls[1] ? (
                      <Image
                        src={urls[1]}
                        alt=""
                        aria-hidden
                        fill
                        sizes={cardImageSizes}
                        className="object-cover opacity-0 transition-opacity group-hover:opacity-100"
                        style={motionStyle}
                      />
                    ) : null}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400" aria-hidden>
                    Sem foto
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {isNew ? <Badge variant="lancamento" size="xs" sticker={isSticker}>{newBadgeLabel}</Badge> : null}
                  {!inStock ? <Badge variant="estornado" size="xs" sticker={isSticker}>Esgotado</Badge> : null}
                  {discountPct ? <Badge variant="desconto" size="xs" sticker={isSticker}>{discountPct}% OFF</Badge> : null}
                </div>
                <div className="absolute top-2 right-2">
                  <WishlistHeartButton productId={id} />
                </div>
                {isIndustrial ? (
                  <span
                    className="absolute bottom-2 left-2 px-1 text-[9px] font-bold"
                    style={{ backgroundColor: "#000", color: "#fff", fontFamily: "'Space Mono', monospace" }}
                  >
                    Nº {String(idx + 1).padStart(4, "0")}
                  </span>
                ) : null}
              </div>
              <div className="p-2 space-y-1.5 flex-1 flex flex-col">
                <h3
                  className="text-sm font-medium line-clamp-2"
                  style={{ color: lmfitTokens.text }}
                  title={String(p.name ?? "")}
                >
                  {String(p.name ?? "Produto")}
                </h3>
                {colors.length > 0 ? (
                  <div className="flex items-center gap-1" aria-label="Cores disponíveis">
                    {colors.slice(0, 5).map((c) => {
                      const hex = resolveSwatchColor(c);
                      return (
                        <span
                          key={c}
                          title={c}
                          className="w-3.5 h-3.5 rounded-full border"
                          style={{
                            backgroundColor: hex ?? "var(--card-bg)",
                            borderColor: hex ? "rgba(0,0,0,0.15)" : lmfitTokens.border,
                          }}
                        />
                      );
                    })}
                    {colors.length > 5 ? (
                      <span className="text-[10px]" style={{ color: lmfitTokens.textMuted }}>
                        +{colors.length - 5}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-auto">
                  <PriceTag price={price} priceMax={priceMax} compareAt={compareAt} mode={mode} />
                </div>
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
