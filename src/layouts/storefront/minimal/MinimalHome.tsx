"use client";

import * as React from "react";
import { ScrollReveal } from "@/components/organisms/ScrollReveal";
import { TrustBar } from "@/components/organisms/TrustBar";
import { useThemePreset } from "@/context/TenantContext";
import type { HomeSlots } from "../types";

/** Família minimal (Calvin Klein/Lululemon/COS): zero ruído — uma foto, MUITO respiro, e o grid.
 *  Loop 23 — 2 dos 3 presets dessa família são gêneros opostos (Calvin Klein austero vs.
 *  Lululemon acolhedor), então a família ramifica por preset (`useThemePreset`, não só por token
 *  de composição — decisão do Loop 19 §3.2, sem componente novo):
 *  - **Luxo** (Calvin Klein): "cromo quase zero" de verdade — só hero + grid, sem lookbook/cupom.
 *  - **Wellness** (Lululemon): faixa de benefício (`TrustBar`) antes do grid — o convite/calor que
 *    Luxo deliberadamente omite. `CategoryChips` ("compre por atividade") mudou pro header em
 *    `MinimalHeader.tsx` (Loop V4-1) — é lá que uma nav de verdade pertence.
 *  - **Minimal** (anti-design): comportamento de sempre — hero, respiro, grid, lookbook/cupom
 *    como momentos secundários. */
export function MinimalHome({ slots }: { slots: HomeSlots }) {
  const preset = useThemePreset();
  const isLuxo = preset === "luxo";
  const isWellness = preset === "studio";

  return (
    <div>
      {slots.hero}
      <div className="py-10 sm:py-16" aria-hidden />
      {isWellness ? (
        <div className="pb-2">
          <TrustBar />
        </div>
      ) : null}
      <div className="space-y-8">
        {slots.filtersBlock}
        <ScrollReveal>{slots.grid}</ScrollReveal>
        {isLuxo ? null : (
          <div className="pt-8 space-y-8">
            {slots.lookbook}
            {slots.coupon}
          </div>
        )}
      </div>
    </div>
  );
}
