"use client";

import * as React from "react";
import type { PdpSlots } from "../types";

/** Família classic: PDP 50/50 — galeria sticky à esquerda, caixa de compra à direita. É a
 *  estrutura que a PDP sempre teve; as outras famílias divergem dela. */
export function ClassicPDP({ slots }: { slots: PdpSlots }) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-32">
      {slots.backLink}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        <div className="lg:sticky lg:top-4 space-y-2">
          {slots.gallery}
          {slots.thumbs}
        </div>
        <div className="mt-6 lg:mt-0">{slots.info}</div>
      </div>
      {slots.related}
    </div>
  );
}
