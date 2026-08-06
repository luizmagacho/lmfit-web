"use client";

import Link from "next/link";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

/** "Trocas e devoluções" — página informativa (política do lojista), distinta do formulário de
 *  solicitação de verdade (`ReturnRequestForm`, dentro de um pedido específico em `/conta`). */
export default function DevolucoesPage() {
  const { tenant } = useTenant();
  const policy = tenant?.storefront?.returnPolicy;
  const windowDays = policy?.windowDays ?? 30;

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-semibold"
        style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}
      >
        Trocas e devoluções
      </h1>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: lmfitTokens.text }}>
        <p>
          Você tem até <strong>{windowDays} dias</strong> após o recebimento pra solicitar troca ou
          devolução de qualquer item.
        </p>
        {policy?.policyText ? (
          policy.policyText.split(/\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)
        ) : (
          <p style={{ color: lmfitTokens.textMuted }}>
            {tenant?.name || "Esta loja"} ainda não configurou detalhes adicionais sobre a política
            de trocas e devoluções.
          </p>
        )}
      </div>
      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        Pra solicitar uma troca ou devolução, acesse{" "}
        <Link href="/conta" className="underline font-medium" style={{ color: lmfitTokens.primary }}>
          Minha Conta
        </Link>{" "}
        e escolha o pedido correspondente.
      </p>
    </div>
  );
}
