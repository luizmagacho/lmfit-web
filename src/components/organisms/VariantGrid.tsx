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

function productPriceRetail(p: Product): number {
  const anyp = p as { priceRetail?: number; price?: number };
  if (typeof anyp.priceRetail === "number") return anyp.priceRetail;
  if (typeof anyp.price === "number") return anyp.price;
  return 0;
}

function productPriceWholesale(p: Product): number | null {
  const anyp = p as { priceWholesale?: number };
  return typeof anyp.priceWholesale === "number" ? anyp.priceWholesale : null;
}

function productMinWholesale(p: Product): number {
  const anyp = p as { minWholesaleQty?: number };
  const n = typeof anyp.minWholesaleQty === "number" ? anyp.minWholesaleQty : 6;
  return Math.max(1, Math.floor(n));
}

export function VariantGrid({
  product,
  role,
  loading,
}: {
  product: Product | null;
  role: CustomerRole;
  loading?: boolean;
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
      const variantRetail = d.price && d.price > 0 ? d.price : retail;
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
    (row: VariantRowData, nextRaw: number) => {
      const next = Math.max(0, Math.floor(nextRaw));
      setLocalQty((prev) => ({ ...prev, [row.variantId]: next }));
      if (!product) return;
      const retail = productPriceRetail(product);
      const wholesale = productPriceWholesale(product);
      const minQty = productMinWholesale(product);
      const pid = documentId(product);
      const name = String((product as { name?: unknown }).name ?? "Produto");
      const img = resolvePrimaryImageUrl(product);

      const existing = cart.lines.find((l) => l.variantId === row.variantId);
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
        );
      } else {
        cart.setQuantity(row.variantId, next);
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
        const cartQty = cart.lines.find((l) => l.variantId === r.variantId)?.quantity ?? 0;
        const qty = localQty[r.variantId] ?? cartQty;
        return (
          <VariantQtyRow
            key={r.variantId}
            data={r}
            quantity={qty}
            focused={focusVariantId === r.variantId}
            onFocus={() => setFocusVariantId(r.variantId)}
            onChange={(next) => setQty(r, next)}
          />
        );
      })}
    </ul>
  );
}
