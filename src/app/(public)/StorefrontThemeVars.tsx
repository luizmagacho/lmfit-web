"use client";

import { useThemeTokens } from "@/context/TenantContext";

/**
 * Loop 4d — paleta/movimento por preset, escopados só ao subtree público via um wrapper com CSS
 * vars inline, NUNCA em `document.documentElement` (que `TenantContext.tsx` já usa globalmente pra
 * fonte/raio/acento — herdado também pelo painel admin e PDV, ver `AppProviders`). Reaproveita os
 * MESMOS nomes de variável que todo componente público já lê (`--kivoni-text`, `--kivoni-surface`,
 * etc.) — CSS custom properties resolvem no ponto de uso, então redefini-las aqui, num ancestral
 * dentro de `(public)`, sobrescreve o valor só para esse subtree, sem tocar `:root`/`.dark` nem
 * vazar pro admin (uma árvore de DOM completamente separada).
 */
/** Loop 4f — velocidade do ticker derivada de `motionDurationMs` (80-600ms no schema) em vez de um
 *  22s fixo pra todo preset; escala linearmente pra uma faixa de "giro" plausível (14-32s) em vez de
 *  reusar o valor em ms puro (que é uma escala completamente diferente, pensada pra transições
 *  rápidas de hover, não pra um scroll contínuo de faixa). */
export function tickerDurationSeconds(motionDurationMs: number): number {
  return Math.round(14 + (motionDurationMs / 600) * 18);
}

export function StorefrontThemeVars({ children }: { children: React.ReactNode }) {
  const { palette, motionDurationMs, motionEasing } = useThemeTokens();

  const style = {
    "--background": palette.bg,
    "--foreground": palette.text,
    "--app-bg": palette.bg,
    "--card-bg": palette.surface,
    "--kivoni-surface": palette.surface,
    "--lmfit-surface": palette.surface,
    "--kivoni-text": palette.text,
    "--kivoni-text-muted": palette.textMuted,
    "--kivoni-border": palette.border,
    "--kivoni-storefront-motion-duration": `${motionDurationMs}ms`,
    "--kivoni-storefront-motion-easing": motionEasing,
    "--kivoni-storefront-ticker-duration": `${tickerDurationSeconds(motionDurationMs)}s`,
  } as React.CSSProperties;

  return <div style={style}>{children}</div>;
}
