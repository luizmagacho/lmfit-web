"use client";

import * as React from "react";
import { Store, Truck, Zap } from "lucide-react";
import { useCheckoutStore, type ShippingMethod } from "@/stores/useCheckoutStore";
import { Badge } from "@/components/atoms/Badge";
import { lmfitTokens } from "@/theme/tokens";
import { useTenant } from "@/context/TenantContext";
import type { ShippingConfig } from "@/stores/useTenantStore";

/** Mesmos defaults do `computeShippingCost` no backend (`order-drafts.service.ts`) — usados só
 *  até o tenant configurar sua própria taxa em Configurações > Frete. */
const DEFAULT_STANDARD_FEE = 19.9;
const DEFAULT_EXPRESS_FEE = 39.9;

function buildMethods(cfg: ShippingConfig | undefined, subtotal: number) {
  const threshold = cfg?.freeAboveTotal;
  const free = !!threshold && threshold > 0 && subtotal >= threshold;
  const standardFee = free ? 0 : cfg?.standardFee ?? DEFAULT_STANDARD_FEE;
  const expressFee = free ? 0 : cfg?.expressFee ?? DEFAULT_EXPRESS_FEE;
  return [
    {
      id: "pickup" as ShippingMethod,
      label: cfg?.pickupLabel || "Retirada em Loja / Banca",
      description: "Retire hoje mesmo. Sem frete.",
      price: 0,
      icon: Store,
      highlight: true,
    },
    {
      id: "standard" as ShippingMethod,
      label: "Entrega padrão",
      description: "Em até 3 dias úteis.",
      price: standardFee,
      icon: Truck,
    },
    {
      id: "express" as ShippingMethod,
      label: "Entrega expressa",
      description: "Mesmo dia para a Grande SP.",
      price: expressFee,
      icon: Zap,
    },
  ];
}

export function ShippingPicker({ subtotal = 0 }: { subtotal?: number }) {
  const { shipping, setShipping } = useCheckoutStore();
  const { tenant } = useTenant();
  const methods = buildMethods(tenant?.shippingConfig, subtotal);
  return (
    <ul className="space-y-2">
      {methods.map((m) => {
        const active = shipping === m.id;
        const Icon = m.icon;
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setShipping(m.id)}
              className="w-full text-left border rounded-lg p-3 flex items-start gap-3 bg-[var(--card-bg)]"
              style={{
                borderColor: active ? lmfitTokens.primary : lmfitTokens.border,
                boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${lmfitTokens.primary} 33%, transparent)` : undefined,
              }}
              aria-pressed={active}
            >
              <Icon size={20} aria-hidden style={{ color: active ? lmfitTokens.primary : lmfitTokens.textMuted }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
                    {m.label}
                  </span>
                  {m.highlight ? <Badge variant="estoque" size="xs">Recomendado</Badge> : null}
                </div>
                <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                  {m.description}
                </p>
              </div>
              <div className="tabular-nums text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                {m.price === 0 ? "Grátis" : `R$ ${m.price.toFixed(2).replace(".", ",")}`}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function shippingCost(
  method: ShippingMethod,
  cfg?: ShippingConfig,
  subtotal = 0,
): number {
  return buildMethods(cfg, subtotal).find((m) => m.id === method)?.price ?? 0;
}
