import { http } from "@/lib/http";
import { extractListItems } from "@/lib/normalizeApiList";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { getOfflineDb, type CatalogSnapshotRow } from "./offlineDb";

const WALK_IN_META_KEY = "walkInCustomer";

export type CachedWalkInCustomer = { id: string; name: string };

type LocationStockItem = { variantId: string; sku: string; productName: string; quantity: number };

/** The API serializes money fields as pt-BR formatted strings (e.g. `"39,90"`), not raw
 *  numbers — a plain `Number(...)` silently turns that into `NaN` (the comma breaks it),
 *  which is how this snapshot's prices ended up as R$0,00 until Loop 5's live browser
 *  verification caught it. Mirrors the same tolerant parsing `variantDrafts.ts`'s `num()`
 *  already uses elsewhere in the PDV for this exact reason. */
function parseMoney(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/** Refreshes this device's local catalog snapshot for one location: cross-references the
 *  location's allocated quantities (`GET /locations/:id/stock`, the source of truth for
 *  what that PDV can sell) with full product/variant details (`GET /products`, which the
 *  stock endpoint alone doesn't carry — price, barcode, color/size, image). Replaces the
 *  whole snapshot atomically so a variant that lost all its allocation disappears too. */
export async function refreshSnapshot(locationId: string): Promise<void> {
  // `PaginationQueryDto` on the API rejects any `limit` above 1000 — this covers every
  // tenant on this platform today (SMB catalogs), but a tenant whose catalog or per-location
  // allocation ever exceeds 1000 items would silently miss the rest here; paginating through
  // multiple pages would be the fix if that ever becomes real.
  const [stockRes, productsRes] = await Promise.all([
    http.get<{ items: LocationStockItem[] }>(`/locations/${locationId}/stock`, {
      params: { limit: 1000 },
    }),
    http.get<unknown>("/products", { params: { limit: 1000 } }),
  ]);

  const stockByVariant = new Map(stockRes.data.items.map((i) => [i.variantId, i.quantity]));
  const products = extractListItems(productsRes.data) as Array<Record<string, unknown>>;

  const rows: CatalogSnapshotRow[] = [];
  for (const p of products) {
    const productId = String(p._id ?? "");
    const productName = String(p.name ?? "");
    const variants = Array.isArray(p.variants) ? (p.variants as Array<Record<string, unknown>>) : [];
    for (const v of variants) {
      const variantId = String(v._id ?? "");
      if (!variantId) continue;
      const quantity = stockByVariant.get(variantId);
      if (quantity === undefined) continue; // nothing allocated to this location — not sellable here
      rows.push({
        variantId,
        productId,
        sku: String(v.sku ?? ""),
        barcode: v.barcode ? String(v.barcode) : undefined,
        productName,
        color: v.color ? String(v.color) : undefined,
        size: v.size ? String(v.size) : undefined,
        unitPrice: parseMoney(v.price ?? p.priceRetail, 0),
        imageUrl: resolvePrimaryImageUrl({ ...p, ...v }) ?? undefined,
        quantity,
      });
    }
  }

  const db = await getOfflineDb();
  const tx = db.transaction("catalogSnapshot", "readwrite");
  await tx.store.clear();
  await Promise.all(rows.map((r) => tx.store.put(r)));
  await tx.done;
}

/** Fetches the tenant's walk-in ("Consumidor Final") customer and caches it locally — called
 *  whenever the device is online, same "warm the offline snapshot" moment as `refreshSnapshot`,
 *  so checkout with no customer picked (the most common counter sale) can resolve who to bill
 *  it to without a live network call once the connection drops. */
export async function refreshWalkInCustomer(): Promise<void> {
  const { data } = await http.post<{ _id?: string; id?: string; name?: string }>("/customers/walk-in");
  const customer: CachedWalkInCustomer = {
    id: String(data._id ?? data.id ?? ""),
    name: data.name ?? "Consumidor Final",
  };
  if (!customer.id) return;
  const db = await getOfflineDb();
  await db.put("meta", { key: WALK_IN_META_KEY, value: customer });
}

/** Offline-safe read of the cached walk-in customer — null if it was never warmed (e.g. first
 *  ever PDV open happened offline). */
export async function getCachedWalkInCustomer(): Promise<CachedWalkInCustomer | null> {
  const db = await getOfflineDb();
  const row = await db.get("meta", WALK_IN_META_KEY);
  return (row?.value as CachedWalkInCustomer | undefined) ?? null;
}

function matchesTerm(row: CatalogSnapshotRow, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return false;
  return (
    row.productName.toLowerCase().includes(needle) ||
    row.sku.toLowerCase().includes(needle) ||
    (row.color?.toLowerCase().includes(needle) ?? false) ||
    (row.size?.toLowerCase().includes(needle) ?? false)
  );
}

/** Local (offline-safe) equivalent of `pdvSearchProducts` — reads only from the device's
 *  own catalog snapshot, no network. */
export async function searchLocal(term: string, limit = 20): Promise<CatalogSnapshotRow[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("catalogSnapshot");
  return all.filter((r) => matchesTerm(r, term)).slice(0, limit);
}

/** Every product currently in this device's local snapshot, alphabetical — the PDV's default
 *  browsable list before the operator types anything. Without this, opening the PDV and losing
 *  the connection before ever typing a search leaves nothing to pick from, even though the
 *  catalog itself was already saved locally from the last time the device was online. */
export async function listAllLocal(limit = 50): Promise<CatalogSnapshotRow[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("catalogSnapshot");
  return all.sort((a, b) => a.productName.localeCompare(b.productName)).slice(0, limit);
}

/** Local (offline-safe) equivalent of `pdvLookupByBarcode`. */
export async function lookupLocalByBarcode(code: string): Promise<CatalogSnapshotRow | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const db = await getOfflineDb();
  const row = await db.getFromIndex("catalogSnapshot", "barcode", trimmed);
  return row ?? null;
}

/** Regroups flat snapshot rows (one per variant) back into the product-with-nested-variants
 *  shape `VariantGrid`/`pickProduct` already know how to render — the snapshot itself is
 *  flat (keyed by variantId) because that's what the barcode/product indexes need, but the
 *  rest of the PDV UI works one level up, at the product. Deliberately conservative:
 *  `acceptsBackorder` is always false here, since whether a variant is eligible for
 *  encomenda isn't part of the snapshot and guessing "yes" offline could let an operator
 *  promise stock that was never really available. */
function groupSnapshotRowsIntoProducts(rows: CatalogSnapshotRow[]): Array<Record<string, unknown>> {
  const byProduct = new Map<string, { name: string; variants: Array<Record<string, unknown>> }>();
  for (const r of rows) {
    const entry = byProduct.get(r.productId) ?? { name: r.productName, variants: [] };
    entry.variants.push({
      _id: r.variantId,
      sku: r.sku,
      color: r.color,
      size: r.size,
      barcode: r.barcode,
      price: r.unitPrice,
      quantityOnHand: r.quantity,
      quantityInStock: r.quantity,
      acceptsBackorder: false,
      backorderMinQty: 1,
      images: r.imageUrl ? [r.imageUrl] : [],
    });
    byProduct.set(r.productId, entry);
  }
  return [...byProduct.entries()].map(([productId, { name, variants }]) => ({
    _id: productId,
    name,
    sku: variants[0]?.sku ?? "",
    priceRetail: variants[0]?.price ?? 0,
    variants,
  }));
}

/** Drop-in offline fallback for `pdvSearchProducts` — same product-with-variants shape. */
export async function searchLocalAsProducts(term: string, limit = 20): Promise<Array<Record<string, unknown>>> {
  const rows = await searchLocal(term, limit * 10);
  return groupSnapshotRowsIntoProducts(rows).slice(0, limit);
}

/** Product-with-variants shape of `listAllLocal` — the PDV's default browsable list. */
export async function listAllLocalAsProducts(limit = 50): Promise<Array<Record<string, unknown>>> {
  const rows = await listAllLocal(limit * 10);
  return groupSnapshotRowsIntoProducts(rows).slice(0, limit);
}

/** Drop-in offline fallback for `pdvLookupByBarcode`. */
export async function lookupLocalByBarcodeAsProduct(
  code: string,
): Promise<{ product: Record<string, unknown>; variantId?: string } | null> {
  const row = await lookupLocalByBarcode(code);
  if (!row) return null;
  const [product] = groupSnapshotRowsIntoProducts([row]);
  return { product, variantId: row.variantId };
}
