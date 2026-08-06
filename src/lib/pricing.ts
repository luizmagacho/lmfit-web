import { formatBRL } from "@/lib/formatMoney";

export type PriceMode = "atacado" | "varejo";

/** Loop 2 — desconto no Pix / parcelamento, configurados em Settings, mesma regra em card/PDP/
 *  sacola/checkout. */
export type PricingDisplayRules = {
  pixDiscountPercent: number;
  maxInstallments: number;
};

/** `null` quando o tenant não configurou desconto — o chamador simplesmente não mostra a linha. */
export function computePixPrice(price: number, rules: PricingDisplayRules): number | null {
  if (!rules.pixDiscountPercent || rules.pixDiscountPercent <= 0) return null;
  return Math.round(price * (1 - rules.pixDiscountPercent / 100) * 100) / 100;
}

/** `null` quando o tenant não habilitou parcelamento (`maxInstallments <= 1`) — sem juros: este
 *  código nunca modelou juros de parcelamento, só divide o valor à vista. */
export function installmentsText(price: number, rules: PricingDisplayRules): string | null {
  if (!rules.maxInstallments || rules.maxInstallments <= 1) return null;
  const n = Math.floor(rules.maxInstallments);
  const perInstallment = Math.round((price / n) * 100) / 100;
  return `${n}x de ${formatBRL(perInstallment)} sem juros`;
}

export type PricingInput = {
  priceRetail?: number | null;
  priceWholesale?: number | null;
  /** Quantidade mínima para ativar preço de atacado (por item). Padrão 1 (sem mínimo). */
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
  const minQty = Math.max(1, Math.floor(input.minWholesaleQty ?? 1));
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
