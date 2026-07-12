import type { OrderLineInput } from "./types";
import { parseBRLToNumber } from "@/lib/formatMoney";

export { parseBRLToNumber };

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
