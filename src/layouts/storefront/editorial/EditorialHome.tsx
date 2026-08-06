"use client";

import * as React from "react";
import { ProductRail } from "@/components/organisms/ProductRail";
import { ScrollReveal } from "@/components/organisms/ScrollReveal";
import { useThemePreset } from "@/context/TenantContext";
import type { HomeSlots } from "../types";

/** Família editorial (Zara/Chanel) — Loop V4-2: até aqui Editorial e Boutique renderizavam os
 *  MESMOS blocos, na mesma ordem, divergindo só em tokens CSS — apesar de referências opostas
 *  (Zara: narrativa rápida, rail de lançamentos; Chanel: still-life quase estática, sem rail).
 *  A família agora ramifica por preset (`useThemePreset`, mesmo padrão do Loop 19 §3.2):
 *  - **Editorial** (Zara): storytelling primeiro — hero full-bleed, lookbook em destaque, rail
 *    horizontal de lançamentos, e o grid só depois da narrativa.
 *  - **Boutique** (Chanel): sem `ProductRail` (corte completo, não só reposicionado — decisão
 *    confirmada com o usuário), mais respiro (`space-y-12` vs. `space-y-8`), grid logo após o
 *    hero (sem narrativa atrasando a compra), lookbook como nota final discreta, cupom no final.
 *  Trust bar fica de fora dos dois (ruído comercial demais pra vibe de revista). Loop 25 —
 *  "parallax leve" interpretado como a duração mais lenta dos 10 presets (600ms,
 *  `motionDurationMs` do Editorial) aplicada ao mesmo `ScrollReveal` transversal — sem mecanismo
 *  de parallax de scroll de verdade só pra este preset (ver decisões da spec do Loop 25). */
export function EditorialHome({ slots }: { slots: HomeSlots }) {
  const preset = useThemePreset();

  if (preset === "boutique") {
    return (
      <div className="space-y-12">
        {slots.hero}
        {slots.filtersBlock}
        <ScrollReveal>{slots.grid}</ScrollReveal>
        {slots.lookbook}
        {slots.coupon}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {slots.hero}
      {slots.lookbook}
      <ProductRail items={slots.newItems} title="Lançamentos" />
      {slots.coupon}
      {slots.filtersBlock}
      <ScrollReveal>{slots.grid}</ScrollReveal>
    </div>
  );
}
