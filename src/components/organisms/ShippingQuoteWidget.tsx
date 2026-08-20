"use client";

import * as React from "react";
import { useState } from "react";
import { Truck } from "lucide-react";
import { isValidCep, lookupCep, maskCep, onlyCepDigits } from "@/lib/cep";
import { publicHttp } from "@/lib/publicHttp";
import { lmfitTokens } from "@/theme/tokens";

/** BRL money fields chegam formatados como string pt-BR ("37,79") via
 *  BrlMoneyResponseInterceptor global — mesmo parser já usado em ProductGrid.tsx/ShippingPicker.tsx. */
function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

type QuoteOption = {
  method: string;
  label: string;
  price: number;
  deliveryDays?: number;
  isPickup?: boolean;
};

/**
 * Loop 27 — widget de cotação de frete na PDP: cliente digita o CEP, vê os mesmos preços/prazos
 * reais (ou fallback fixo, se a loja não tiver Melhor Envio configurado) que vai ver no checkout.
 * Cota pela variante `variantId` recebida (peso/dimensões vivem no produto, então qualquer
 * variante do mesmo produto dá o mesmo resultado — só precisa de um id válido pra consultar).
 */
export function ShippingQuoteWidget({ variantId }: { variantId?: string }) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<QuoteOption[] | null>(null);

  async function handleCalculate() {
    const digits = onlyCepDigits(cep);
    if (!isValidCep(digits)) {
      setError("CEP inválido.");
      setOptions(null);
      return;
    }
    if (!variantId) return;
    setError(null);
    setLoading(true);
    setOptions(null);
    try {
      // Confirma o CEP antes de cotar — mesma UX do checkout (AddressForm), evita cotar um CEP
      // digitado errado sem o cliente perceber.
      const address = await lookupCep(digits);
      if (!address) {
        setError("Não encontramos esse CEP.");
        return;
      }
      const { data } = await publicHttp.post<
        Array<{ method: string; label: string; price: unknown; deliveryDays?: number; isPickup?: boolean }>
      >("/public/shipping/quote", {
        destinationCep: digits,
        lines: [{ variantId, quantity: 1 }],
      });
      setOptions(
        data.map((o) => ({
          method: o.method,
          label: o.label,
          price: extractPrice(o.price),
          deliveryDays: o.deliveryDays,
          isPickup: o.isPickup,
        })),
      );
    } catch {
      setError("Não foi possível calcular o frete agora. Tente de novo mais tarde.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Truck size={16} aria-hidden style={{ color: lmfitTokens.textMuted }} />
        <span className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
          Calcular frete e prazo
        </span>
      </div>
      <div className="flex gap-2 max-w-xs">
        <input
          type="text"
          inputMode="numeric"
          value={maskCep(cep)}
          onChange={(e) => setCep(onlyCepDigits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCalculate();
            }
          }}
          placeholder="00000-000"
          maxLength={9}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border bg-[var(--card-bg)] text-sm outline-none focus:ring-1 focus:ring-violet-500"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        />
        <button
          type="button"
          onClick={handleCalculate}
          disabled={loading || !variantId}
          className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          {loading ? "Calculando…" : "Calcular"}
        </button>
      </div>
      {error ? (
        <p className="text-xs" style={{ color: lmfitTokens.error }}>
          {error}
        </p>
      ) : null}
      {options && options.length > 0 ? (
        <ul className="space-y-1.5 pt-1">
          {options.map((o) => (
            <li key={o.method} className="flex items-center justify-between text-sm">
              <span style={{ color: lmfitTokens.text }}>
                {o.label}
                {o.deliveryDays ? (
                  <span style={{ color: lmfitTokens.textMuted }}> · até {o.deliveryDays} dia(s) útil(eis)</span>
                ) : null}
              </span>
              <span className="tabular-nums font-semibold" style={{ color: lmfitTokens.text }}>
                {o.price === 0 ? "Grátis" : `R$ ${o.price.toFixed(2).replace(".", ",")}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
