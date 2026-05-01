import { http } from "@/lib/http";
import { extractListItems, extractListTotal } from "@/lib/normalizeApiList";
import type { BulkChange } from "@/stores/useInventoryBulkStore";

type InventoryVariantRow = {
  _id?: string;
  id?: string;
  sku?: string;
  color?: string;
  size?: string;
  price?: number;
  quantityInStock?: number;
  quantityOnHand?: number;
};

export type InventoryProduct = Record<string, unknown> & {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
  price?: number;
  quantityInStock?: number;
  variants?: InventoryVariantRow[];
};

export type InventoryAggregate = {
  hasVariants: boolean;
  variantCount: number;
  displayPrice: number;
  displayStock: number;
  /** `true` quando há variantes com preços diferentes, impossibilitando `priceSet`/`pricePercent` global. */
  mixedPrices: boolean;
};

export function summarizeInventoryProduct(p: InventoryProduct): InventoryAggregate {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  if (variants.length === 0) {
    return {
      hasVariants: false,
      variantCount: 0,
      displayPrice: typeof p.price === "number" ? p.price : 0,
      displayStock: typeof p.quantityInStock === "number" ? p.quantityInStock : 0,
      mixedPrices: false,
    };
  }
  let sumStock = 0;
  let first: number | null = null;
  let mixed = false;
  for (const v of variants) {
    const qty =
      typeof v.quantityOnHand === "number"
        ? v.quantityOnHand
        : typeof v.quantityInStock === "number"
          ? v.quantityInStock
          : 0;
    sumStock += qty;
    if (typeof v.price === "number") {
      if (first === null) first = v.price;
      else if (v.price !== first) mixed = true;
    }
  }
  const displayPrice = first ?? (typeof p.price === "number" ? p.price : 0);
  return {
    hasVariants: true,
    variantCount: variants.length,
    displayPrice,
    displayStock: sumStock,
    mixedPrices: mixed,
  };
}

export async function listProductsForBulk(params: { search?: string; page?: number; limit?: number } = {}) {
  const { page = 1, limit = 50, search } = params;
  const q: Record<string, string | number> = { page, limit };
  if (search?.trim()) q.search = search.trim();
  const { data } = await http.get<unknown>("/products", { params: q });
  const items = extractListItems(data) as InventoryProduct[];
  return { items, total: extractListTotal(data, items.length) };
}

export type BulkResult = {
  updated: string[];
  failed: Array<{ id: string; error: string }>;
};

/** Tenta o endpoint unificado PATCH /products/bulk; em caso de 404/405 cai no modo "um a um". */
export async function bulkPatchProducts(ids: string[], changes: BulkChange): Promise<BulkResult> {
  const body = { ids, changes };
  try {
    const { data } = await http.patch<BulkResult>("/products/bulk", body);
    if (data && Array.isArray(data.updated)) return data;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 404 && status !== 405) throw err;
  }

  const updated: string[] = [];
  const failed: BulkResult["failed"] = [];
  await Promise.all(
    ids.map(async (id) => {
      try {
        await http.patch(`/products/${encodeURIComponent(id)}`, changes);
        updated.push(id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao atualizar";
        failed.push({ id, error: msg });
      }
    }),
  );
  return { updated, failed };
}
