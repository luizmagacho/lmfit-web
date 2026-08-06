"use client";

import * as React from "react";
import { ScrollReveal } from "@/components/organisms/ScrollReveal";
import type { HomeSlots } from "../types";

/** Família expressive (Farm Rio): cor em blocos — cada seção editorial vive num "cartão" com a
 *  superfície colorida do preset, cantos bem arredondados, tudo respirando alegria. */
export function ExpressiveHome({ slots }: { slots: HomeSlots }) {
  return (
    <div className="space-y-6">
      {slots.hero}
      {slots.coupon}
      <div className="rounded-3xl p-4 sm:p-5" style={{ backgroundColor: "var(--kivoni-surface)" }}>
        {slots.newArrivals}
      </div>
      {slots.lookbook}
      {slots.trustBar}
      <div className="rounded-3xl p-4 sm:p-5" style={{ backgroundColor: "var(--kivoni-surface)" }}>
        <div className="space-y-4">
          {slots.filtersBlock}
          <ScrollReveal>{slots.grid}</ScrollReveal>
        </div>
      </div>
    </div>
  );
}
