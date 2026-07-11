import { documentId } from "../normalizeApiList";

export type ProductVariantDraft = {
  clientKey: string;
  serverId?: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  quantityInStock: number;
  /** Permite vender além do estoque (produção sob encomenda); só tem efeito em planos com produção. */
  acceptsBackorder: boolean;
  /** Quantidade mínima para aceitar encomenda (ex.: só produz a partir de 3 peças). */
  backorderMinQty: number;
};

let seq = 0;
function nextKey() {
  seq += 1;
  return `v-${seq}`;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function variantQty(v: Record<string, unknown>): number {
  const q =
    v.quantityInStock ??
    v.quantityOnHand ??
    v.stock ??
    v.qty;
  return Math.max(0, Math.floor(num(q, 0)));
}

/** Monta rascunhos a partir da linha da API (nested `variants` ou produto flat). */
export function draftsFromProductRow(row: Record<string, unknown> | null): ProductVariantDraft[] {
  if (!row) {
    return [
      {
        clientKey: nextKey(),
        sku: "",
        color: "Único",
        size: "Único",
        price: 0,
        quantityInStock: 0,
        acceptsBackorder: false,
        backorderMinQty: 1,
      },
    ];
  }
  const variants = row.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    const out: ProductVariantDraft[] = [];
    for (const raw of variants) {
      if (!raw || typeof raw !== "object") continue;
      const v = raw as Record<string, unknown>;
      const id = documentId(v);
      out.push({
        clientKey: id || nextKey(),
        serverId: id || undefined,
        sku: String(v.sku ?? "").trim(),
        color: String(v.color ?? "").trim() || "Único",
        size: String(v.size ?? "").trim() || "Único",
        price: num(v.price, 0),
        quantityInStock: variantQty(v),
        acceptsBackorder: v.acceptsBackorder === true,
        backorderMinQty: Math.max(1, Math.floor(num(v.backorderMinQty, 1))),
      });
    }
    return out.length ? out : draftsFromProductRow(null);
  }
  const pid = documentId(row);
  return [
    {
      clientKey: pid || nextKey(),
      serverId: pid || undefined,
      sku: String(row.sku ?? "").trim(),
      color: "Único",
      size: "Único",
      price: num(row.price, 0),
      quantityInStock: variantQty(row),
      acceptsBackorder: row.acceptsBackorder === true,
      backorderMinQty: Math.max(1, Math.floor(num(row.backorderMinQty, 1))),
    },
  ];
}

/** Garante colunas de listagem (sku / preço / estoque) coerentes com a primeira variante. */
export function flattenFirstVariantOnRow(row: Record<string, unknown>): Record<string, unknown> {
  const drafts = draftsFromProductRow(row);
  const first = drafts[0];
  if (!first) return row;
  return {
    ...row,
    sku: first.sku,
    price: first.price,
    quantityInStock: first.quantityInStock,
  };
}

export function draftsToApiVariants(
  drafts: ProductVariantDraft[],
): Array<Record<string, unknown>> {
  return drafts.map((d) => {
    const o: Record<string, unknown> = {
      sku: d.sku.trim(),
      color: d.color.trim() || "Único",
      size: d.size.trim() || "Único",
      price: d.price,
      quantityInStock: Math.max(0, Math.floor(d.quantityInStock)),
      quantityOnHand: Math.max(0, Math.floor(d.quantityInStock)),
      acceptsBackorder: d.acceptsBackorder,
      backorderMinQty: Math.max(1, Math.floor(d.backorderMinQty || 1)),
    };
    if (d.serverId) o._id = d.serverId;
    return o;
  });
}

export function validateVariantDrafts(drafts: ProductVariantDraft[]): string | null {
  if (!drafts.length) return "Adicione pelo menos uma variação (cor / tamanho / SKU).";
  const skus = new Set<string>();
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const sku = d.sku.trim();
    if (!sku) return `Linha ${i + 1}: informe o SKU da variação.`;
    const lk = sku.toLowerCase();
    if (skus.has(lk)) return `SKU duplicado: ${sku}`;
    skus.add(lk);
    if (!Number.isFinite(d.price) || d.price < 0) return `Linha ${i + 1}: preço inválido.`;
    if (!Number.isFinite(d.quantityInStock) || d.quantityInStock < 0) {
      return `Linha ${i + 1}: quantidade em estoque inválida.`;
    }
  }
  return null;
}
