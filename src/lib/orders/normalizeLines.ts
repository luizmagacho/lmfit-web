import type { OrderLineInput } from "./types";

export function parseBRLToNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  if (!s) return 0;
  // Strip "R$", spaces, etc.
  const clean = s.replace(/[^0-9,\.-]/g, "");
  if (clean.includes(",")) {
    const noThousands = clean.replace(/\./g, "");
    const normalized = noThousands.replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeOrderLines(raw: unknown): OrderLineInput[] {
  if (!Array.isArray(raw)) return [];
  const out: OrderLineInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const variantId = o.variantId != null ? String(o.variantId) : "";
    if (!variantId) continue;
    const quantity = Number(o.quantity);
    const unitPrice = parseBRLToNumber(o.unitPrice);
    const productionPrice = parseBRLToNumber(o.productionPrice);
    const descriptionRaw = o.description;
    const description =
      descriptionRaw == null || descriptionRaw === "" ? null : String(descriptionRaw);
    out.push({
      variantId,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      productionPrice: Number.isFinite(productionPrice) ? productionPrice : 0,
      description,
    });
  }
  return out;
}
