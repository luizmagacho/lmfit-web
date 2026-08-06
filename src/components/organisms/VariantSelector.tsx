"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { documentId } from "@/lib/normalizeApiList";
import { resolveSwatchColor } from "@/lib/colorSwatch";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { inferModeForUser, type CustomerRole } from "@/lib/pricing";
import { trackAddToCart } from "@/lib/analytics";
import { useCartStore } from "@/stores/useCartStore";
import { useThemeTokens } from "@/context/TenantContext";
import { Badge, type BadgeVariant } from "@/components/atoms/Badge";
import { PriceTag } from "@/components/atoms/PriceTag";
import { Button } from "@/components/atoms/Button";
import { lmfitTokens } from "@/theme/tokens";

type Variant = {
  _id?: unknown;
  id?: unknown;
  sku?: unknown;
  color?: unknown;
  size?: unknown;
  price?: unknown;
  priceRetail?: unknown;
  priceWholesale?: unknown;
  minWholesaleQty?: unknown;
  quantityOnHand?: unknown;
  reorderPoint?: unknown;
  acceptsBackorder?: unknown;
  backorderMinQty?: unknown;
};

type Product = Record<string, unknown> & { variants?: Variant[] };

export type VariantStockState = "disponivel" | "ultimas-unidades" | "esgotado" | "sob-encomenda";

function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

/** Mesmos campos/limiares já usados pelo alerta de estoque baixo (`low-stock.cron.ts`) — nenhum
 *  conceito novo de inventário, só reaproveitado pra decidir o estado do botão de tamanho. */
export function deriveStockState(v: Variant): VariantStockState {
  const qty = typeof v.quantityOnHand === "number" ? v.quantityOnHand : 0;
  const reorderPoint = typeof v.reorderPoint === "number" ? v.reorderPoint : 0;
  const acceptsBackorder = v.acceptsBackorder === true;
  if (qty <= 0) return acceptsBackorder ? "sob-encomenda" : "esgotado";
  if (reorderPoint > 0 && qty <= reorderPoint) return "ultimas-unidades";
  return "disponivel";
}

const STOCK_STATE_LABEL: Record<VariantStockState, string> = {
  disponivel: "Disponível",
  "ultimas-unidades": "Últimas unidades",
  esgotado: "Esgotado",
  "sob-encomenda": "Sob encomenda",
};

const STOCK_STATE_BADGE: Record<VariantStockState, BadgeVariant | null> = {
  disponivel: null,
  "ultimas-unidades": "estoque",
  esgotado: "estornado",
  "sob-encomenda": "sob-encomenda",
};

export function VariantSelector({ product, role }: { product: Product; role: CustomerRole }) {
  const cart = useCartStore();
  const { buttonStyle } = useThemeTokens();
  const mode = inferModeForUser(role);
  const variants = useMemo(() => (Array.isArray(product.variants) ? product.variants : []), [product]);

  const colors = useMemo(() => {
    const seen = new Set<string>();
    for (const v of variants) {
      if (typeof v.color === "string" && v.color.trim()) seen.add(v.color.trim());
    }
    return [...seen];
  }, [variants]);

  const [selectedColor, setSelectedColor] = useState<string>(colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const sizesForColor = useMemo(() => {
    const pool = selectedColor ? variants.filter((v) => v.color === selectedColor) : variants;
    const seen = new Set<string>();
    const out: Variant[] = [];
    for (const v of pool) {
      const key = typeof v.size === "string" && v.size.trim() ? v.size.trim() : documentId(v);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }, [variants, selectedColor]);

  const selectedVariant = useMemo(
    () =>
      sizesForColor.find((v) => (typeof v.size === "string" ? v.size.trim() : "") === selectedSize) ??
      (sizesForColor.length === 1 ? sizesForColor[0] : undefined),
    [sizesForColor, selectedSize],
  );

  if (variants.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
        Este produto não tem variações cadastradas.
      </div>
    );
  }

  const stockState = selectedVariant ? deriveStockState(selectedVariant) : null;
  const canAdd = !!selectedVariant && stockState !== "esgotado";

  const retail = selectedVariant ? extractPrice(selectedVariant.price ?? selectedVariant.priceRetail) : 0;
  const wholesaleRaw = selectedVariant?.priceWholesale;
  const wholesale =
    wholesaleRaw === undefined || wholesaleRaw === null || wholesaleRaw === "" ? retail : extractPrice(wholesaleRaw);
  const displayPrice = mode === "atacado" ? wholesale : retail;

  function handleAdd() {
    if (!selectedVariant || !canAdd) return;
    const vid = documentId(selectedVariant) || String(selectedVariant.sku ?? "");
    const minQty = typeof selectedVariant!.minWholesaleQty === "number" ? selectedVariant!.minWholesaleQty : 1;
    const isOrder = stockState === "sob-encomenda";
    const backorderMinQty =
      typeof selectedVariant!.backorderMinQty === "number" ? selectedVariant!.backorderMinQty : 1;
    const effectiveQty = isOrder ? Math.max(qty, backorderMinQty) : qty;
    cart.addOrIncrement(
      {
        variantId: vid,
        productId: documentId(product),
        productName: String(product.name ?? "Produto"),
        sku: String(selectedVariant.sku ?? vid),
        color: typeof selectedVariant.color === "string" ? selectedVariant.color : undefined,
        size: typeof selectedVariant.size === "string" ? selectedVariant.size : undefined,
        priceRetail: retail,
        priceWholesale: wholesale,
        minWholesaleQty: minQty,
        imageUrl: resolvePrimaryImageUrl(product),
        category: typeof product.category === "string" ? product.category : undefined,
      },
      effectiveQty,
      isOrder,
    );
    trackAddToCart({
      id: vid,
      name: String(product.name ?? "Produto"),
      price: displayPrice,
      quantity: effectiveQty,
    });
    setAdded(true);
    cart.open();
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="space-y-4">
      {colors.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
            Cor {selectedColor ? `· ${selectedColor}` : ""}
          </span>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const hex = resolveSwatchColor(c);
              const active = selectedColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => {
                    setSelectedColor(c);
                    setSelectedSize("");
                  }}
                  aria-pressed={active}
                  className="w-9 h-9 rounded-full border-2 flex-shrink-0"
                  style={{
                    backgroundColor: hex ?? "var(--card-bg)",
                    borderColor: active ? lmfitTokens.primary : hex ? "rgba(0,0,0,0.15)" : lmfitTokens.border,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <span className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
          Tamanho
        </span>
        <div className="flex flex-wrap gap-2">
          {sizesForColor.map((v) => {
            const sizeLabel = typeof v.size === "string" && v.size.trim() ? v.size.trim() : "Único";
            const st = deriveStockState(v);
            const active = selectedSize === sizeLabel || (sizesForColor.length === 1 && !selectedSize);
            const disabled = st === "esgotado";
            return (
              <button
                key={String(v.size ?? documentId(v))}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedSize(sizeLabel)}
                aria-pressed={active}
                className="min-w-11 min-h-11 px-3 rounded-md border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: active ? lmfitTokens.primary : lmfitTokens.border,
                  backgroundColor: active ? lmfitTokens.primary : "var(--card-bg)",
                  color: active ? "#fff" : lmfitTokens.text,
                  textDecoration: disabled ? "line-through" : undefined,
                }}
              >
                {sizeLabel}
              </button>
            );
          })}
        </div>
        {stockState && stockState !== "disponivel" ? (
          <Badge variant={STOCK_STATE_BADGE[stockState] ?? "neutral"} size="xs">
            {STOCK_STATE_LABEL[stockState]}
          </Badge>
        ) : null}
      </div>

      {selectedVariant ? (
        <div className="space-y-3">
          <PriceTag price={displayPrice} mode={mode} />
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-md" style={{ borderColor: lmfitTokens.border }}>
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-11 text-lg"
                style={{ color: lmfitTokens.text }}
                aria-label="Diminuir quantidade"
              >
                −
              </button>
              <span className="w-8 text-center text-sm tabular-nums" style={{ color: lmfitTokens.text }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-9 h-11 text-lg"
                style={{ color: lmfitTokens.text }}
                aria-label="Aumentar quantidade"
              >
                +
              </button>
            </div>
            <Button variant={buttonStyle} onClick={handleAdd} disabled={!canAdd} className="flex-1">
              {added ? "Adicionado!" : stockState === "sob-encomenda" ? "Encomendar" : "Adicionar à sacola"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Selecione um tamanho para ver o preço.
        </p>
      )}
    </div>
  );
}
