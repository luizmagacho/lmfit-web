"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsentStatus, setConsentStatus } from "@/lib/cookieConsent";
import { lmfitTokens } from "@/theme/tokens";

/**
 * Loop 10 (LGPD) — checkout já coleta nome/e-mail/telefone/endereço; isso é obrigação legal de
 * aviso independente de qualquer analytics existir (que ainda não existe). Sem gate de feature
 * nenhuma hoje — só grava a escolha, pronto pra um consumidor futuro (analytics) checar.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsentStatus() === null);
  }, []);

  if (!visible) return null;

  function decide(status: "accepted" | "declined") {
    setConsentStatus(status);
    setVisible(false);
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 border-t bg-[var(--card-bg)] px-4 py-3 flex flex-col sm:flex-row items-center gap-3"
      style={{ borderColor: lmfitTokens.border }}
      role="dialog"
      aria-label="Consentimento de cookies"
    >
      <p className="text-xs flex-1" style={{ color: lmfitTokens.textMuted }}>
        Usamos cookies para lembrar sua sessão e melhorar sua experiência de compra. Veja nossa{" "}
        <Link href="/privacidade" className="underline" style={{ color: lmfitTokens.primary }}>
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => decide("declined")}
          className="min-h-9 px-3 rounded-md border text-xs font-medium"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="min-h-9 px-3 rounded-md text-xs font-medium text-white"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
