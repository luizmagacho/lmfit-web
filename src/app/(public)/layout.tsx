import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ChatWidget } from "@/components/organisms/ChatWidget";
import { CookieConsentBanner } from "@/components/organisms/CookieConsentBanner";
import { AnalyticsScripts } from "@/components/organisms/AnalyticsScripts";
import { StorefrontThemeVars } from "./StorefrontThemeVars";
import { PublicHeader } from "./PublicHeader";
// Loop V4-3 — mesma causa raiz do Loop 20 (reconstrução pós-corrupção do iCloud de 2026-07-26):
// este arquivo existe desde o Loop 4 mas nunca foi importado em lugar nenhum — os overrides de
// font-family por preset em h1/h2/h3/.storefront-brand-heading, o !important de border-radius, e
// a animação do .kivoni-ticker-track nunca chegavam a existir como CSS de verdade, mesmo com as
// variáveis --kivoni-font-display/--kivoni-radius resolvendo certo (StorefrontThemeVars religado
// desde o Loop 20) — a regra que CONSOME essas variáveis é que nunca carregava.
import "./storefront-themes.css";

export const metadata: Metadata = {
  title: "Kivoni - Catálogo",
  description: "Catálogo de produtos Kivoni",
};
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    // Loop 20 — religa `StorefrontThemeVars` (Loop 4d), código morto desde algum ponto após a
    // reconstrução pós-corrupção do iCloud de 2026-07-26 (mesma causa raiz do Loop 19a): sem ela,
    // a paleta e a duração/curva de movimento por preset nunca chegavam a existir como CSS var
    // nenhuma — todo mundo caía no `ease` padrão do navegador, silenciosamente.
    <StorefrontThemeVars>
      <div className="min-h-screen bg-[var(--lmfit-surface)] text-[var(--foreground)] pb-28">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <PublicHeader />
          {children}
        </div>
        <ChatWidget />
        <AnalyticsScripts />
        <CookieConsentBanner />
      </div>
    </StorefrontThemeVars>
  );
}
