import type { PurchaseLineInput } from "./types";

export function normalizePurchaseLines(raw: unknown): PurchaseLineInput[] {
  if (!Array.isArray(raw)) return [];
  const out: PurchaseLineInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const variantId = o.variantId != null ? String(o.variantId) : "";
    if (!variantId) continue;
    const quantityOrdered = Number(o.quantityOrdered);
    const quantityReceivedRaw = o.quantityReceived;
    const quantityReceived =
      quantityReceivedRaw == null || quantityReceivedRaw === ""
        ? undefined
        : Number(quantityReceivedRaw);
    out.push({
      variantId,
      quantityOrdered: Number.isFinite(quantityOrdered) ? quantityOrdered : 0,
      quantityReceived:
        quantityReceived !== undefined && Number.isFinite(quantityReceived)
          ? quantityReceived
          : undefined,
    });
  }
  return out;
}
