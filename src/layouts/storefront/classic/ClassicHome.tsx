"use client";

import * as React from "react";
import { CategoryTiles } from "@/components/organisms/CategoryTiles";
import { ProductRail } from "@/components/organisms/ProductRail";
import { ScrollReveal } from "@/components/organisms/ScrollReveal";
import { useThemePreset, useThemeTokens } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import type { HomeSlots } from "../types";

/** Família classic (Renner/Nike/Adidas): a estrutura "canônica" — hero compacto, trust bar,
 *  vitrines e grid denso em ordem óbvia. `space-y-6` (não `space-y-4`) porque é literalmente o
 *  mesmo wrapper que `LojaClient.tsx` usava antes do Loop 19a religar a família.
 *  Loop 24 — 2 dos 3 presets são gêneros opostos (Renner "departamento" vs. Nike "drop
 *  culture"), então a família ramifica por preset dentro do MESMO componente (`useThemePreset`,
 *  decisão do Loop 19 §3.2, sem componente novo): Essencial ganha tiles de categoria com foto
 *  (`CategoryTiles`, novo — a chip de texto do header não bastava pro pedido do plano); Atlético
 *  troca a prateleira de lançamentos por um rail horizontal de "drops" (`ProductRail`, já
 *  existente desde o Loop 12 — reusa, não recria).
 *  Loop V4-3 — Impacto era o fallback silencioso da família (nenhuma decisão própria, apesar de
 *  ter referência distinta: "tipo gigante itálico, blocos retos"). Ganha uma faixa full-width com
 *  marquee animado (reaproveita a MESMA classe CSS `.kivoni-ticker-track` do `AnnouncementTicker`/
 *  `MarqueeTape`, montada inline — não generaliza `MarqueeTape`, que fica exclusivo da identidade
 *  Streetwear), usando só tokens que Impacto já possui (`fontDisplay: "Anton"`,
 *  `heading.weight: 900`, `heading.italic: true`, `newBadgeLabel: "LANÇAMENTO"`). */
export function ClassicHome({ slots }: { slots: HomeSlots }) {
  const preset = useThemePreset();
  const { newBadgeLabel } = useThemeTokens();
  const isEssencial = preset === "essencial";
  const isAtletico = preset === "performance";
  const isImpacto = preset === "impacto";

  return (
    <div className="space-y-6">
      {slots.hero}
      {slots.trustBar}
      {slots.coupon}
      {isImpacto ? (
        <div
          data-testid="impacto-marquee"
          className="overflow-hidden -mx-4 border-y"
          style={{ borderColor: lmfitTokens.border, backgroundColor: lmfitTokens.surface }}
        >
          <div className="kivoni-ticker-track flex whitespace-nowrap py-3">
            {[0, 1].map((copy) => (
              <span key={copy} className="flex">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="px-6 text-3xl sm:text-5xl italic font-black uppercase"
                    style={{ fontFamily: "var(--kivoni-font-display)", color: lmfitTokens.text }}
                  >
                    {newBadgeLabel}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {isEssencial ? <CategoryTiles items={slots.newItems} /> : null}
      {isAtletico ? <ProductRail items={slots.newItems} title={newBadgeLabel} /> : slots.newArrivals}
      {slots.lookbook}
      {/* filtros+grid compartilhavam um wrapper `space-y-4` próprio antes do Loop 19a — preservado
         aqui (só nesta família) pra regressão zero; as demais famílias não tinham esse nível extra. */}
      <div className="space-y-4">
        {slots.filtersBlock}
        <ScrollReveal>{slots.grid}</ScrollReveal>
      </div>
    </div>
  );
}
