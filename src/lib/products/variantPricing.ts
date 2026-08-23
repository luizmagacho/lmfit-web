/** Compartilhado entre `VariantGrid.tsx` (grade de variações do PDV) e o leitor de código de
 *  barras com carrinho — os dois precisam do mesmo cálculo de preço/atacado a partir de um
 *  produto bruto vindo da API, então em vez de duplicar isso vira um único lugar de verdade. */

type ProductLike = Record<string, unknown>;

export function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function productPriceRetail(p: ProductLike): number {
  const anyp = p as { priceRetail?: unknown; price?: unknown };
  if (anyp.priceRetail !== undefined && anyp.priceRetail !== null) return extractPrice(anyp.priceRetail);
  if (anyp.price !== undefined && anyp.price !== null) return extractPrice(anyp.price);
  return 0;
}

export function productPriceWholesale(p: ProductLike): number | null {
  const anyp = p as { priceWholesale?: unknown };
  if (anyp.priceWholesale === undefined || anyp.priceWholesale === null || anyp.priceWholesale === "") return null;
  return extractPrice(anyp.priceWholesale);
}

export function productMinWholesale(p: ProductLike): number {
  const anyp = p as { minWholesaleQty?: number };
  const n = typeof anyp.minWholesaleQty === "number" ? anyp.minWholesaleQty : 1;
  return Math.max(1, Math.floor(n));
}
