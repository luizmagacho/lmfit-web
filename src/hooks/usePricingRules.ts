"use client";

import { useTenant } from "@/context/TenantContext";
import { computePixPrice, installmentsText, type PricingDisplayRules } from "@/lib/pricing";

/**
 * Regras de exibição de preço do tenant (desconto no Pix, parcelamento) — configuradas em
 * Configurações > Desconto no Pix e parcelamento (Loop 2). Usado em card de produto, PDP, sacola
 * e checkout para manter a mesma mensagem em todas as superfícies.
 */
export function usePricingRules() {
  const { tenant } = useTenant();
  const rules: PricingDisplayRules = {
    pixDiscountPercent: tenant?.pricingDisplay?.pixDiscountPercent ?? 0,
    maxInstallments: tenant?.pricingDisplay?.maxInstallments ?? 1,
  };

  return {
    ...rules,
    pixPriceFor: (price: number) => computePixPrice(price, rules),
    installmentsTextFor: (price: number) => installmentsText(price, rules),
  };
}
