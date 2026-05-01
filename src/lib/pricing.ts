export type PriceMode = "atacado" | "varejo";

export type PricingInput = {
  priceRetail?: number | null;
  priceWholesale?: number | null;
  /** Quantidade mínima para ativar preço de atacado (por item). Padrão 6. */
  minWholesaleQty?: number | null;
  /** Preço flat (produto sem distinção). */
  price?: number | null;
};

/** Papel do usuário logado (ou visitante) que afeta preço e catalogo. */
export type CustomerRole = "wholesaler" | "retail" | "staff" | "guest";

export function inferModeForUser(role: CustomerRole): PriceMode {
  return role === "wholesaler" || role === "staff" ? "atacado" : "varejo";
}

export function resolveUnitPrice(input: PricingInput, quantity: number, role: CustomerRole): {
  price: number;
  mode: PriceMode;
} {
  const qty = Math.max(1, Math.floor(quantity || 1));
  const baseRetail = firstFinite([input.priceRetail, input.price, 0]);
  const baseWholesale = firstFinite([input.priceWholesale, input.priceRetail, input.price, 0]);
  const minQty = Math.max(1, Math.floor(input.minWholesaleQty ?? 6));
  const userMode = inferModeForUser(role);
  if (userMode === "atacado" || qty >= minQty) {
    return { price: baseWholesale, mode: "atacado" };
  }
  return { price: baseRetail, mode: "varejo" };
}

export function computeCartTotals<T extends { unitPrice: number; quantity: number }>(lines: T[]): {
  items: number;
  subtotal: number;
} {
  let items = 0;
  let subtotal = 0;
  for (const l of lines) {
    if (!l) continue;
    items += Math.max(0, Math.floor(l.quantity ?? 0));
    subtotal += (Number.isFinite(l.unitPrice) ? l.unitPrice : 0) * Math.max(0, l.quantity ?? 0);
  }
  return { items, subtotal };
}

function firstFinite(xs: Array<number | null | undefined>): number {
  for (const x of xs) {
    if (typeof x === "number" && Number.isFinite(x)) return x;
  }
  return 0;
}
