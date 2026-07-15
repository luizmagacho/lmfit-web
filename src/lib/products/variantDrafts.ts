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
  /** Preço definido à mão pelo usuário nesta variação — a calculadora de
   * custo+margem não deve mais sobrescrevê-lo. */
  priceManuallySet: boolean;
};

/** Espelha o cálculo do servidor em products.service.ts resolveReadyMadePricing. */
export function computeReadyMadePrice(costPrice: number, markupPercent: number): number {
  return Math.round(costPrice * (1 + markupPercent / 100) * 100) / 100;
}

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

/** Preço calculado (custo + margem) de um produto "item pronto", ou null se não se aplica. */
function readyMadeComputedPrice(row: Record<string, unknown>): number | null {
  if (row.sourceType !== "ready_made") return null;
  const cost = num(row.costPrice, NaN);
  const markup = num(row.markupPercent, NaN);
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(markup)) return null;
  return computeReadyMadePrice(cost, markup);
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
        priceManuallySet: false,
      },
    ];
  }
  // Variação salva com preço diferente do calculado = ajuste manual do usuário,
  // que deve sobreviver a novas edições de custo/margem.
  const computedPrice = readyMadeComputedPrice(row);
  const isManualPrice = (price: number) =>
    computedPrice !== null && Math.abs(price - computedPrice) >= 0.005;
  const variants = row.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    const out: ProductVariantDraft[] = [];
    for (const raw of variants) {
      if (!raw || typeof raw !== "object") continue;
      const v = raw as Record<string, unknown>;
      const id = documentId(v);
      const price = num(v.price, 0);
      out.push({
        clientKey: id || nextKey(),
        serverId: id || undefined,
        sku: String(v.sku ?? "").trim(),
        color: String(v.color ?? "").trim() || "Único",
        size: String(v.size ?? "").trim() || "Único",
        price,
        quantityInStock: variantQty(v),
        acceptsBackorder: v.acceptsBackorder === true,
        backorderMinQty: Math.max(1, Math.floor(num(v.backorderMinQty, 1))),
        priceManuallySet: isManualPrice(price),
      });
    }
    return out.length ? out : draftsFromProductRow(null);
  }
  const pid = documentId(row);
  const flatPrice = num(row.price, 0);
  return [
    {
      clientKey: pid || nextKey(),
      serverId: pid || undefined,
      sku: String(row.sku ?? "").trim(),
      color: "Único",
      size: "Único",
      price: flatPrice,
      quantityInStock: variantQty(row),
      acceptsBackorder: row.acceptsBackorder === true,
      backorderMinQty: Math.max(1, Math.floor(num(row.backorderMinQty, 1))),
      priceManuallySet: isManualPrice(flatPrice),
    },
  ];
}

/** Menor e maior preço entre as variações de um produto (pra listagem "55,00/80,00"). */
export function priceRangeFromRow(row: Record<string, unknown>): { min: number; max: number } | null {
  const variants = row.variants;
  if (!Array.isArray(variants) || variants.length === 0) return null;
  const prices: number[] = [];
  for (const raw of variants) {
    if (!raw || typeof raw !== "object") continue;
    const value = (raw as Record<string, unknown>).price;
    if (value === null || value === undefined || value === "") continue;
    const p = num(value, NaN);
    if (Number.isFinite(p)) prices.push(p);
  }
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
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
