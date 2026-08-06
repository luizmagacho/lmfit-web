"use client";

import * as React from "react";
import { Truck, CreditCard, ShieldCheck } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

const ITEMS = [
  { icon: Truck, label: "Envios para todo o Brasil" },
  { icon: CreditCard, label: "Parcele no cartão" },
  { icon: ShieldCheck, label: "Compra segura" },
];

/** Barra de confiança (Loop 4 continuação) — só aparece se o tenant habilitar em "Loja online". */
export function TrustBar() {
  const { tenant } = useTenant();
  if (!tenant?.storefront?.showTrustBar) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-3 text-xs" style={{ color: lmfitTokens.textMuted }}>
      {ITEMS.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon size={14} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}
