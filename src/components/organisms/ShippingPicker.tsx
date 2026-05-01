"use client";

import { Store, Truck, Zap } from "lucide-react";
import { useCheckoutStore, type ShippingMethod } from "@/stores/useCheckoutStore";
import { Badge } from "@/components/atoms/Badge";
import { lmfitTokens } from "@/theme/tokens";

const METHODS: Array<{
  id: ShippingMethod;
  label: string;
  description: string;
  price: number;
  icon: typeof Truck;
  highlight?: boolean;
}> = [
  {
    id: "pickup",
    label: "Retirada em Loja / Banca",
    description: "Retire hoje mesmo na Rua Oriente. Sem frete.",
    price: 0,
    icon: Store,
    highlight: true,
  },
  {
    id: "standard",
    label: "Entrega padrão",
    description: "Em até 3 dias úteis.",
    price: 19.9,
    icon: Truck,
  },
  {
    id: "express",
    label: "Entrega expressa",
    description: "Mesmo dia para a Grande SP.",
    price: 39.9,
    icon: Zap,
  },
];

export function ShippingPicker() {
  const { shipping, setShipping } = useCheckoutStore();
  return (
    <ul className="space-y-2">
      {METHODS.map((m) => {
        const active = shipping === m.id;
        const Icon = m.icon;
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setShipping(m.id)}
              className="w-full text-left border rounded-lg p-3 flex items-start gap-3 bg-white"
              style={{
                borderColor: active ? lmfitTokens.primary : lmfitTokens.border,
                boxShadow: active ? `0 0 0 2px ${lmfitTokens.primary}33` : undefined,
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

export function shippingCost(method: ShippingMethod): number {
  return METHODS.find((m) => m.id === method)?.price ?? 0;
}
