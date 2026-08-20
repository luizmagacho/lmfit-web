"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Store, Truck, Zap } from "lucide-react";
import { useCheckoutStore, type ShippingMethod } from "@/stores/useCheckoutStore";
import { useCartStore } from "@/stores/useCartStore";
import { Badge } from "@/components/atoms/Badge";
import { lmfitTokens } from "@/theme/tokens";
import { useTenant } from "@/context/TenantContext";
import { publicHttp } from "@/lib/publicHttp";
import { isValidCep, onlyCepDigits } from "@/lib/cep";
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

/** BRL money fields chegam formatados como string pt-BR ("37,79") via
 *  BrlMoneyResponseInterceptor global — mesmo parser já usado em ProductGrid.tsx. */
function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

type ShippingOption = {
  id: ShippingMethod;
  label: string;
  description: string;
  price: number;
  icon: typeof Store;
  highlight?: boolean;
  deliveryDays?: number;
};

/** Loop 27 — cotação real via Melhor Envio. Só dispara quando há CEP válido + itens no carrinho;
 *  em qualquer outro caso (sem CEP ainda, API fora, tenant sem token configurado) o componente
 *  segue mostrando `buildMethods()` (fallback fixo, offline) — nunca trava o checkout esperando a
 *  rede. Um CEP inválido do lado do cliente nem chega a chamar a API (mesmo princípio de
 *  `AddressForm`, que já bloqueia no client antes de bater no servidor). */
function useRealShippingOptions(destinationCep: string | undefined, lines: Array<{ variantId: string; quantity: number }>) {
  const [options, setOptions] = useState<ShippingOption[] | null>(null);

  useEffect(() => {
    const digits = onlyCepDigits(destinationCep ?? "");
    if (!isValidCep(digits) || lines.length === 0) {
      setOptions(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await publicHttp.post<
          Array<{ method: string; label: string; price: unknown; deliveryDays?: number; isPickup?: boolean }>
        >("/public/shipping/quote", {
          destinationCep: digits,
          lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        });
        if (cancelled) return;
        setOptions(
          data.map((o) => ({
            id: o.method as ShippingMethod,
            label: o.label,
            description: o.isPickup
              ? "Retire hoje mesmo. Sem frete."
              : o.deliveryDays
                ? `Em até ${o.deliveryDays} dia(s) útil(eis).`
                : "Entrega via transportadora.",
            price: extractPrice(o.price),
            icon: o.isPickup ? Store : Truck,
            highlight: o.isPickup,
            deliveryDays: o.deliveryDays,
          })),
        );
      } catch {
        // Falha silenciosa — o caller cai no fallback fixo de sempre, o cliente nunca vê erro de frete.
        if (!cancelled) setOptions(null);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [destinationCep, lines]);

  return options;
}

export function ShippingPicker({ subtotal = 0 }: { subtotal?: number }) {
  const { shipping, setShipping, setShippingQuote, address } = useCheckoutStore();
  const cartLines = useCartStore((s) => s.lines);
  const { tenant } = useTenant();
  const realOptions = useRealShippingOptions(address?.cep, cartLines);
  const methods: ShippingOption[] = realOptions ?? buildMethods(tenant?.shippingConfig, subtotal);

  function handleSelect(m: ShippingOption) {
    setShipping(m.id);
    setShippingQuote(
      m.id.startsWith("me:") ? { method: m.id, label: m.label, price: m.price, deliveryDays: m.deliveryDays } : null,
    );
  }

  return (
    <ul className="space-y-2">
      {methods.map((m) => {
        const active = shipping === m.id;
        const Icon = m.icon;
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => handleSelect(m)}
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
