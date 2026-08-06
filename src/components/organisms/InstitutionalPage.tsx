"use client";

import * as React from "react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";

export type InstitutionalPageKey = "quemSomos" | "comoComprar" | "guiaMedidas" | "contato";

/**
 * Página institucional (Loop 4 continuação) — texto simples configurado pelo lojista em
 * "Loja online" (sem editor rico, conforme decisão do spec). Uma só página cobre as 4 rotas
 * (quem-somos, como-comprar, guia-medidas, contato) trocando `pageKey`/`title`.
 */
export function InstitutionalPage({ pageKey, title }: { pageKey: InstitutionalPageKey; title: string }) {
  const { tenant } = useTenant();
  const text = tenant?.storefront?.pages?.[pageKey];
  const whatsapp = pageKey === "contato" ? tenant?.whatsappNumber?.replace(/\D/g, "") : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}>
        {title}
      </h1>
      {text ? (
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: lmfitTokens.text }}>
          {text.split(/\n+/).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          {tenant?.name || "Esta loja"} ainda não configurou este conteúdo.
        </p>
      )}
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium underline"
          style={{ color: lmfitTokens.primary }}
        >
          Falar no WhatsApp
        </a>
      ) : null}
    </div>
  );
}
