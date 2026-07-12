export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Parses a monetary API field that may arrive as either a raw number or a pt-BR
 * formatted string (the global BrlMoneyResponseInterceptor on the API turns fields
 * like `unitPrice`/`total` into strings such as "1.234,56") — plain `Number(val)`
 * returns NaN on the comma-decimal form, which silently blanks the value in the UI.
 */
export function parseBRLToNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  if (!s) return 0;
  // Strip "R$", spaces, etc.
  const clean = s.replace(/[^0-9,.-]/g, "");
  if (clean.includes(",")) {
    const noThousands = clean.replace(/\./g, "");
    const normalized = noThousands.replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}
