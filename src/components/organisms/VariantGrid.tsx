"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { draftsFromProductRow } from "@/lib/products/variantDrafts";
import { resolveUnitPrice, type CustomerRole } from "@/lib/pricing";
import { documentId } from "@/lib/normalizeApiList";
import { useCartStore } from "@/stores/useCartStore";
import { usePdvStore } from "@/stores/usePdvStore";
import { VariantQtyRow, type VariantRowData } from "@/components/molecules/VariantQtyRow";
import { Skeleton } from "@/components/atoms/Skeleton";
import { lmfitTokens } from "@/theme/tokens";

type Product = Record<string, unknown>;

function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

function productPriceRetail(p: Product): number {
  const anyp = p as { priceRetail?: unknown; price?: unknown };
  if (anyp.priceRetail !== undefined && anyp.priceRetail !== null) return extractPrice(anyp.priceRetail);
  if (anyp.price !== undefined && anyp.price !== null) return extractPrice(anyp.price);
  return 0;
}

function productPriceWholesale(p: Product): number | null {
  const anyp = p as { priceWholesale?: unknown };
  if (anyp.priceWholesale === undefined || anyp.priceWholesale === null || anyp.priceWholesale === '') return null;
  return extractPrice(anyp.priceWholesale);
}

function productMinWholesale(p: Product): number {
  const anyp = p as { minWholesaleQty?: number };
  const n = typeof anyp.minWholesaleQty === "number" ? anyp.minWholesaleQty : 1;
  return Math.max(1, Math.floor(n));
}

export function VariantGrid({
  product,
  role,
  loading,
  onOrderRequest,
  productionLocked,
}: {
  product: Product | null;
  role: CustomerRole;
  loading?: boolean;
  onOrderRequest?: (data: VariantRowData, product: Product) => void;
  productionLocked?: boolean;
}) {
  const cart = useCartStore();
  const focusVariantId = usePdvStore((s) => s.focusVariantId);
  const setFocusVariantId = usePdvStore((s) => s.setFocusVariantId);

  const rows = useMemo<VariantRowData[]>(() => {
    if (!product) return [];
    const drafts = draftsFromProductRow(product);
    const retail = productPriceRetail(product);
    const wholesale = productPriceWholesale(product);
    const minQty = productMinWholesale(product);
    return drafts.map((d, i) => {
      const vid = d.serverId || d.clientKey || `row-${i}`;
      const dPrice = extractPrice(d.price);
      const variantRetail = dPrice > 0 ? dPrice : retail;
      const variantWholesale = wholesale ?? variantRetail;
      const { price } = resolveUnitPrice(
        {
          priceRetail: variantRetail,
          priceWholesale: variantWholesale,
          minWholesaleQty: minQty,
        },
        1,
        role,
      );
      return {
        variantId: vid,
        sku: d.sku || vid,
        color: d.color === "Único" ? undefined : d.color,
        size: d.size === "Único" ? undefined : d.size,
        unitPrice: price,
        stock: d.quantityInStock,
      };
    });
  }, [product, role]);

  const [localQty, setLocalQty] = useState<Record<string, number>>({});
  const productKey = documentId(product ?? {});

  useEffect(() => {
    setLocalQty({});
  }, [productKey]);

  const setQty = useCallback(
    (row: VariantRowData, nextRaw: number, isOrder: boolean = false) => {
      const next = Math.max(0, Math.floor(nextRaw));
      setLocalQty((prev) => ({ ...prev, [row.variantId]: next }));
      if (!product) return;
      const retail = productPriceRetail(product);
      const wholesale = productPriceWholesale(product);
      const minQty = productMinWholesale(product);
      const pid = documentId(product);
      const name = String((product as { name?: unknown }).name ?? "Produto");
      const img = resolvePrimaryImageUrl(product);

      const existing = cart.lines.find((l) => l.variantId === row.variantId && l.isOrder === isOrder);
      if (!existing) {
        if (next <= 0) return;
        cart.addOrIncrement(
          {
            variantId: row.variantId,
            productId: pid,
            productName: name,
            sku: row.sku,
            color: row.color,
            size: row.size,
            priceRetail: row.unitPrice || retail,
            priceWholesale: wholesale ?? row.unitPrice,
            minWholesaleQty: minQty,
            imageUrl: img,
          },
          next,
          isOrder
        );
      } else {
        cart.setQuantity(row.variantId, next, isOrder);
      }
    },
    [cart, product],
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!product) {
    return (
      <div
        className="rounded-lg border p-6 text-center text-sm"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
      >
        Busque por nome ou SKU para lançar em grade.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div
        className="rounded-lg border p-6 text-center text-sm"
        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
      >
        Este produto não tem variações cadastradas.
      </div>
    );
  }

  return (
    <ul className="rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
      {rows.map((r) => {
        const outOfStock = r.stock <= 0;
        const cartQty = cart.lines.find((l) => l.variantId === r.variantId && !!l.isOrder === outOfStock)?.quantity ?? 0;
        const qty = localQty[r.variantId] ?? cartQty;
        return (
          <VariantQtyRow
            key={r.variantId}
            data={r}
            quantity={qty}
            focused={focusVariantId === r.variantId}
            onFocus={() => setFocusVariantId(r.variantId)}
            onChange={(next) => setQty(r, next, outOfStock)}
            onOrderRequest={onOrderRequest ? () => onOrderRequest(r, product) : undefined}
            productionLocked={productionLocked}
          />
        );
      })}
    </ul>
  );
}
