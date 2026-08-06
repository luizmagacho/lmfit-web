"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { MarqueeTape } from "@/components/organisms/MarqueeTape";
import { ScrollReveal } from "@/components/organisms/ScrollReveal";
import { SectionCard } from "@/components/organisms/SectionCard";
import { useThemeTokens } from "@/context/TenantContext";
import type { HomeSlots } from "../types";
import type { TenantInfo } from "@/stores/useTenantStore";

/** Família industrial (Off-White): hero dentro de moldura preta dura com rótulo entre aspas,
 *  fita marquee, grid 1:1 sem arredondamento (tokens) — design bruto, sem suavização. Loop 19:
 *  `sectionTexture` do Streetwear é "grain" — aplicado por cima de tudo via `SectionCard`, textura
 *  sutil de ruído coerente com a estética crua da família, sem tocar contraste de texto (AC7).
 *  Loop 21 — seta (`ArrowUpRight`) antes dos rótulos de seção, mesmo motivo do header. */
export function IndustrialHome({ slots, tenant }: { slots: HomeSlots; tenant: TenantInfo | null }) {
  const { sectionTexture } = useThemeTokens();
  return (
    <SectionCard texture={sectionTexture}>
      <div className="space-y-6">
        {slots.hasHero ? (
          <div>
            <p className="inline-flex items-center gap-1 text-xs font-bold uppercase mb-1 text-[var(--foreground)]">
              <ArrowUpRight size={12} aria-hidden />
              “HOME”
            </p>
            <div style={{ border: "2px solid #000" }} className="p-1.5">
              {slots.hero}
            </div>
          </div>
        ) : null}
        <div className="-mx-4">
          <MarqueeTape text={`“${tenant?.name ?? "ONLINE"}” OFFICIAL STORE`} />
        </div>
        {slots.coupon}
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-bold uppercase mb-2 text-[var(--foreground)]">
            <ArrowUpRight size={12} aria-hidden />
            «PRODUCTS»
          </p>
          <div className="space-y-4">
            {slots.filtersBlock}
            <ScrollReveal>{slots.grid}</ScrollReveal>
          </div>
        </div>
        {slots.lookbook}
      </div>
    </SectionCard>
  );
}
