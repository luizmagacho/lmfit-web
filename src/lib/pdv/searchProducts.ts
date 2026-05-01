import { http } from "@/lib/http";
import { extractListItems } from "@/lib/normalizeApiList";

export type PdvProduct = Record<string, unknown> & {
  _id?: string;
  name?: string;
  sku?: string;
  price?: number;
  priceRetail?: number;
  priceWholesale?: number;
  minWholesaleQty?: number;
  primaryImageUrl?: string;
  images?: Array<string | { url?: string }>;
  variants?: Array<Record<string, unknown>>;
};

export async function pdvSearchProducts(term: string, limit = 20): Promise<PdvProduct[]> {
  const t = term.trim();
  if (!t) return [];
  try {
    const { data } = await http.get<unknown>("/products", {
      params: { search: t, page: 1, limit },
    });
    return extractListItems(data) as PdvProduct[];
  } catch {
    return [];
  }
}
