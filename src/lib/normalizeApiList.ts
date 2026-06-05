/**
 * Normaliza respostas de listagem da API (Nest/Mongo costumam variar).
 */
export function extractListItems(data: unknown): unknown[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const k of ["items", "data", "results", "rows"] as const) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** Total paginado quando a API envia `total` junto da lista. */
export function extractListTotal(data: unknown, fallback: number): number {
  if (data && typeof data === "object" && "total" in data) {
    const t = (data as { total: unknown }).total;
    if (typeof t === "number" && Number.isFinite(t)) return t;
  }
  return fallback;
}

export function documentId(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  const o = row as Record<string, unknown>;
  const id = o._id ?? o.id;
  if (id == null) return "";
  if (typeof id === "object") return JSON.stringify(id);
  return String(id);
}

export type VariantOptionRow = { id: string; sku: string; price: number; label: string; imageUrl?: string };

/** Monta opções de variante para pedidos: `variants[]` ou produto flat (sku/preço no pai). */
export function collectVariantOptionsFromProducts(products: unknown[]): VariantOptionRow[] {
  const opts: VariantOptionRow[] = [];
  for (const raw of products) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const name = String(p.name ?? "Produto");
    opts.push(...variantOptionsForOneProduct(p, name));
  }
  return opts;
}

function extractVariantImageUrl(v: Record<string, unknown>, p: Record<string, unknown>): string | undefined {
  if (Array.isArray(v.images) && v.images.length > 0) {
    const firstImg = v.images[0];
    if (firstImg && typeof firstImg === "object" && firstImg !== null && "url" in firstImg) {
      return String((firstImg as { url: unknown }).url);
    }
    if (typeof firstImg === "string") {
      return firstImg;
    }
  }
  if (p.primaryImageUrl && typeof p.primaryImageUrl === "string") {
    return p.primaryImageUrl;
  }
  if (Array.isArray(p.images) && p.images.length > 0) {
    if (typeof p.images[0] === "string") {
      return p.images[0];
    }
  }
  return undefined;
}

function variantOptionsForOneProduct(p: Record<string, unknown>, productName: string): VariantOptionRow[] {
  const variants = p.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    const out: VariantOptionRow[] = [];
    for (const raw of variants) {
      if (!raw || typeof raw !== "object") continue;
      const v = raw as Record<string, unknown>;
      const id = documentId(v);
      if (!id) continue;
      const sku = String(v.sku ?? id);
      const price = typeof v.price === "number" ? v.price : Number(v.price) || 0;
      const imageUrl = extractVariantImageUrl(v, p);
      out.push({ id, sku, price, label: `${productName} — ${sku}`, imageUrl });
    }
    return out;
  }
  const pid = documentId(p);
  const sku = String(p.sku ?? "").trim();
  if (pid && sku) {
    const price = typeof p.price === "number" ? p.price : Number(p.price) || 0;
    const imageUrl = p.primaryImageUrl && typeof p.primaryImageUrl === "string"
      ? p.primaryImageUrl
      : (Array.isArray(p.images) && p.images.length > 0 && typeof p.images[0] === "string" ? p.images[0] : undefined);
    return [{ id: pid, sku, price, label: `${productName} — ${sku}`, imageUrl }];
  }
  return [];
}
