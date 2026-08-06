"use client";

import * as React from "react";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

/**
 * Banner de cupom de primeira compra (Loop 4 continuação) — só exibe um código já cadastrado no
 * módulo de promoções (`couponBannerCode`); a validação real do desconto continua sendo feita no
 * checkout, sem mudança nenhuma ali. Isso é só vitrine.
 */
export function CouponBanner() {
  const { tenant } = useTenant();
  const code = tenant?.storefront?.couponBannerCode;
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — o código já está visível na tela
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm"
      style={{ borderColor: lmfitTokens.primary, backgroundColor: "color-mix(in srgb, var(--kivoni-primary) 8%, transparent)" }}
    >
      <span style={{ color: lmfitTokens.text }}>
        Use o cupom <strong className="tracking-wide">{code}</strong> e ganhe desconto na primeira compra
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
        style={{ color: lmfitTokens.primary }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
