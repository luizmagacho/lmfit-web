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
  try {
    const { data } = await http.get<unknown>("/products", {
      params: { search: t, page: 1, limit },
    });
    return extractListItems(data) as PdvProduct[];
  } catch {
    return [];
  }
}

export type BarcodeLookupResult = { product: PdvProduct; variantId?: string };

/** Busca exata por código de barras (scanner de câmera). Lança se não encontrar. */
export async function pdvLookupByBarcode(code: string): Promise<BarcodeLookupResult> {
  const { data } = await http.get<BarcodeLookupResult>(
    `/products/barcode/${encodeURIComponent(code.trim())}`,
  );
  return data;
}
