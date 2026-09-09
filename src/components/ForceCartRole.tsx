"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/useCartStore";
import type { PriceMode } from "@/lib/pricing";

/**
 * O preço/badge exibido (atacado x varejo) é definido pela ROTA, não por sessão/gate: `/loja`
 * é sempre varejo, `/catalogo` é sempre atacado, independente do que o visitante escolheu antes
 * (form /atacado, PDV) — desmontar essas duas rotas evita que uma sobrevivência de sessão
 * "vaze" o modo errado pro outro catálogo. Nunca sobrescreve `staff` (operador do PDV).
 */
export function ForceCartRole({ mode }: { mode: PriceMode }) {
  useEffect(() => {
    const { role, setRole } = useCartStore.getState();
    if (role === "staff") return;
    const desired = mode === "atacado" ? "wholesaler" : "guest";
    if (role !== desired) setRole(desired);
  }, [mode]);

  return null;
}
