"use client";

import * as React from "react";
import type { SectionTexture } from "@/theme/storefrontPresets";

/** Loop 19 — ruído CSS puro via SVG `feTurbulence` repetido, sem asset de imagem nenhum. Fica
 *  numa camada `absolute` ATRÁS do conteúdo (nunca sobre texto) — preserva o piso de contraste
 *  WCAG que `isPaletteContrastSafe` já garante pra paleta do preset (AC7). */
const GRAIN_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Loop 19 — wrapper de seção que aplica `sectionTexture`. "none" não monta wrapper nenhum (mesmo
 *  DOM de hoje); "color-card"/"hard-frame" formalizam o que `ExpressiveHome.tsx`/`IndustrialHome.tsx`
 *  já montam manualmente (não os substitui ainda — carry-over de refatoração, ver spec do Loop 19);
 *  "grain" (Streetwear) é o único novo de verdade nesta loop. */
export function SectionCard({
  texture,
  children,
  className = "",
}: {
  texture: SectionTexture;
  children: React.ReactNode;
  className?: string;
}) {
  if (texture === "none") return <>{children}</>;

  if (texture === "color-card") {
    return (
      <div
        className={`relative rounded-3xl p-4 sm:p-5 ${className}`}
        style={{ backgroundColor: "var(--kivoni-surface)" }}
      >
        {children}
      </div>
    );
  }

  if (texture === "hard-frame") {
    return (
      <div className={`relative p-1.5 ${className}`} style={{ border: "2px solid #000" }}>
        {children}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden
        data-testid="section-grain"
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
        style={{ backgroundImage: GRAIN_BACKGROUND }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
